import * as obs from './obs-api';

export class VideoEncoderService
{
    uniqueId: string;

    constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
        let obsEncoder: obs.IVideoEncoder = null;

        if (settings)
            obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId, settings);
        else
            obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId);

        if (!obsEncoder) throw "failed to create video encoder";

        this.uniqueId = uniqueId;
    }
}