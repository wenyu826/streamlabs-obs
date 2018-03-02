import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import GenericFormGroups from './shared/forms/GenericFormGroups.vue';
import { TFormData, TObsValue, IListInput } from './shared/forms/Input';
import { AudioService, E_AUDIO_CHANNELS } from 'services/audio';
import { SourcesService, TSourceType } from 'services/sources';
import { EPropertyType, InputFactory } from 'services/obs-api';

interface AudioLayout {
    name: string,
    desc: string,
    type: TSourceType
}

@Component({
    components: { GenericFormGroups }
})

export default class AudioSettings extends Vue {
    @Inject() audioService: AudioService;
    @Inject() sourcesService: SourcesService;

    private audioDeviceLayout: AudioLayout[] = [
        { name: 'Desktop Audio', desc: 'Desktop Audio Device', type: 'wasapi_output_capture' },
        { name: 'Desktop Audio 2', desc: 'Desktop Audio Device 2', type: 'wasapi_output_capture' },
        { name: 'Mic/Aux', desc: 'Mic/Auxillary Device', type: 'wasapi_input_capture' },
        { name: 'Mic/Aux 2', desc: 'Mic/Auxillary Device 2', type: 'wasapi_input_capture' },
        { name: 'Mic/Aux 3', desc: 'Mic/Auxillary Device 3', type: 'wasapi_input_capture' }
    ];

    get settingsFormData() {
        const audioDevices = this.audioService.getDevices();
        const sourcesInChannels = 
            this
            .sourcesService
            .getSources()
            .filter(source => source.channel !== void 0);

        const forms: IListInput<TObsValue>[] = [];

        for (let i = 0; i < this.audioDeviceLayout.length; ++i) {
            const channel = i + 1;
            const source = sourcesInChannels.find(
                source => source.channel === channel
            );

            let value = null;

            if (source) {
                const obsSource = 
                    InputFactory.fromName(source.sourceId);

                value = obsSource.settings['device_id'];
            }

            const options = 
                audioDevices.filter(device => device.type === 'output')
                .map(device => {
                    return { description: device.description, value: device.id };
                });

            options.unshift({ description: 'Disabled', value: null });

            forms[i] = ({
                value,
                description: this.audioDeviceLayout[i].desc,
                name: this.audioDeviceLayout[i].name,
                type: EPropertyType.List,
                enabled: true,
                visible: true,
                options
            });
        }

        return forms;
    }

    set settingsFormData(formData: IListInput<TObsValue>[]) {
        for (let i = 0; i < formData.length; ++i) {
            const channel = i + 1;
            
            const source = this.sourcesService
                .getSources()
                .find(source => source.channel === channel);

            if (formData[i].value == null) {
                if (source)
                    this.sourcesService.removeSource(source.sourceId);

                continue;
            }

            if (!source) {
                this.sourcesService.createSource(
                    formData[i].name,
                    this.audioDeviceLayout[i].type,
                    {},
                    { channel });

                continue;
            }

            source.updateSettings({ device_id: formData[i].value, name: formData[i].name });
        }
    }
}
