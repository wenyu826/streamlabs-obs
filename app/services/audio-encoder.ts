import * as obs from './obs-api';

export class AudioEncoderService
{
    uniqueId: string;

    constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
        let obsEncoder: obs.IAudioEncoder = null;

        if (settings)
            obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId, settings);
        else
            obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId);

        if (!obsEncoder) throw "failed to create audio encoder";

        this.uniqueId = uniqueId;
    }
}