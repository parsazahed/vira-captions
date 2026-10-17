/* ExtendScript runs in Premiere, separately from the React panel. ES3 syntax is intentional. */
var Vira = (function () {
    var preset = '';
    function json(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/[\x00-\x1f]/g, '') + '"';
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        var fields = []; for (var key in value) if (value.hasOwnProperty(key)) fields.push(json(key) + ':' + json(value[key]));
        return '{' + fields.join(',') + '}';
    }
    function run(fn) { try { return json(fn()); } catch (e) { return json({ error: e.message || String(e) }); } }
    function active() { var seq = app.project.activeSequence; if (!seq) throw new Error('Open an active sequence in Premiere first.'); return seq; }
    function findItem(bin, path) {
        for (var i = 0; i < bin.children.numItems; i++) {
            var item = bin.children[i];
            if (item.getMediaPath && item.getMediaPath() === path) return item;
            if (item.type === ProjectItemType.BIN) { var nested = findItem(item, path); if (nested) return nested; }
        }
        return null;
    }
    return {
        sequence: function () { return run(function () { var s = active(); return { name: s.name, id: String(s.sequenceID), duration: Number(s.end) / 254016000000 }; }); },
        choosePreset: function () { return run(function () {
            var file = File.openDialog('Choose an audio-only WAV export preset (.epr)');
            if (file && /\.epr$/i.test(file.name)) preset = file.fsName;
            else if (file) throw new Error('Choose an Adobe .epr export preset.');
            return { path: preset };
        }); },
        audio: function (options) { return run(function () {
            var s = active(); var duration = Number(s.end) / 254016000000;
            if (options.mode === 'clip') {
                var selection = s.getSelection(); var clip = null;
                if (selection.length > 2 || (selection.length === 2 && selection[0].projectItem.nodeId !== selection[1].projectItem.nodeId)) throw new Error('Select one clip, or one linked video/audio pair.');
                for (var i = 0; i < selection.length; i++) if (selection[i].mediaType === 'Audio') { clip = selection[i]; break; }
                if (!clip && selection.length === 1) clip = selection[0];
                if (!clip) throw new Error('Select one clip, or one linked video/audio pair.');
                if (clip.getSpeed() !== 1 || clip.isSpeedReversed()) throw new Error('Use the sequence or In/Out source for retimed clips.');
                var media = clip.projectItem.getMediaPath();
                if (!media || !new File(media).exists) throw new Error('Clip media is offline or nested. Use the sequence source.');
                return { name: clip.name, path: media, inPoint: clip.inPoint.seconds, duration: clip.duration.seconds, offset: clip.start.seconds, sequenceId: String(s.sequenceID) };
            }
            if (!preset || !new File(preset).exists) throw new Error('Choose an audio-only WAV .epr preset in Connections before exporting the timeline.');
            var start = options.mode === 'range' ? s.getInPointAsTime().seconds : 0;
            var end = options.mode === 'range' ? s.getOutPointAsTime().seconds : duration;
            if (start < 0 || end <= start || end > duration + 1) throw new Error('Set valid In and Out points in the sequence first.');
            var code = s.exportAsMediaDirect(options.output, preset, options.mode === 'range' ? 1 : 0);
            if (code !== 'No Error' && code !== 0 && code !== true) throw new Error('Premiere audio export failed. Check your WAV preset.');
            if (!new File(options.output).exists) throw new Error('Premiere did not create the WAV file. Check the export preset.');
            return { name: s.name, duration: end - start, offset: start, sequenceId: String(s.sequenceID) };
        }); },
        saveFile: function (options) { return run(function () { var file = new File(options.filename).saveDlg('Save captions'); return { path: file ? file.fsName : '' }; }); },
        overlayTarget: function (options) { return run(function () {
            var s = active();
            if (options.sequenceId && String(s.sequenceID) !== options.sequenceId) throw new Error('Return to the sequence you transcribed.');
            var topUsed = -1; var target = -1;
            for (var i = 0; i < s.videoTracks.numTracks; i++) if (s.videoTracks[i].clips.numItems) topUsed = i;
            for (var j = topUsed + 1; j < s.videoTracks.numTracks; j++) if (!s.videoTracks[j].isLocked() && !s.videoTracks[j].isMuted()) { target = j; break; }
            if (target < 0) throw new Error('Add an empty, unlocked, visible video track above your footage, then try again.');
            var settings = s.getSettings();
            if (String(settings.videoPixelAspectRatio) !== '1' && String(settings.videoPixelAspectRatio) !== '1.0') throw new Error('Styled overlays require a square-pixel sequence. Use native captions for this sequence.');
            return { sequenceId: String(s.sequenceID), trackIndex: target, width: settings.videoFrameWidth, height: settings.videoFrameHeight };
        }); },
        importOverlays: function (options) { return run(function () {
            var s = active();
            if (String(s.sequenceID) !== options.sequenceId) throw new Error('Active sequence changed. Try again on the original sequence.');
            var track = s.videoTracks[options.trackIndex];
            if (!track || track.clips.numItems || track.isLocked()) throw new Error('The overlay track changed or is locked. Add an empty track and retry.');
            var paths = []; for (var i = 0; i < options.items.length; i++) paths.push(options.items[i].path);
            var bin = app.project.rootItem.createBin('Vira styled captions');
            if (!app.project.importFiles(paths, true, bin, false)) throw new Error('Premiere could not import the overlay images.');
            try {
                for (var j = 0; j < options.items.length; j++) {
                    var cue = options.items[j]; var item = findItem(bin, cue.path);
                    if (!item) throw new Error('An overlay image was not imported.');
                    track.overwriteClip(item, String(cue.start));
                    var clip = null;
                    for (var k = 0; k < track.clips.numItems; k++) if (track.clips[k].projectItem.nodeId === item.nodeId) { clip = track.clips[k]; break; }
                    if (!clip) throw new Error('Could not place a styled overlay.');
                    var end = new Time(); end.seconds = cue.end; clip.end = end;
                }
            } catch (e) {
                // Only this initially empty track was changed; roll back its inserted clips.
                for (var n = track.clips.numItems - 1; n >= 0; n--) track.clips[n].remove(false, false);
                throw e;
            }
            return { success: true };
        }); },
        importCaptions: function (options) { return run(function () {
            var s = active();
            if (options.sequenceId && String(s.sequenceID) !== options.sequenceId) throw new Error('The active sequence changed. Return to the sequence you transcribed before importing.');
            if (!app.project.importFiles([options.path], true, app.project.rootItem, false)) throw new Error('Premiere could not import the SRT file.');
            var item = findItem(app.project.rootItem, options.path);
            if (!item || !s.createCaptionTrack(item, 0)) throw new Error('Could not create the caption track. Import the saved SRT manually from Documents/Vira Captions.');
            return { success: true };
        }); }
    };
}());
