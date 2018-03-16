import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import ListInput from './shared/forms/ListInput.vue';
import IntInput from './shared/forms/IntInput.vue';
import ResolutionInput from './shared/forms/ResolutionInput.vue';
import { IListInput, IListOption, INumberInputValue } from './shared/forms/Input';
import { EScaleType, VideoFactory } from 'services/obs-api';
import { SettingsStorageService, EFPSType } from 'services/settings';

@Component({
    components: { ListInput, IntInput, ResolutionInput }
})

export default class VideoSettings extends Vue {

    @Inject() settingsStorageService: SettingsStorageService;

    fpsType = this.settingsStorageService.state.Settings.Video.FPSType;

    private get baseResolutionOptions(): IListOption<string>[] {
        /* FIXME TODO Need to add variable resolutions */

        return [
            {
                description: '1920x1080',
                value: '1920x1080'
            },
            {
                description: '1280x720',
                value: '1280x720'
            }
        ];
    }

    baseResolutionFormData = {
        value: this.settingsStorageService.state.Settings.Video.BaseResolution,
        description: 'Base Resolution',
        name: '',
        enabled: true,
        visible: true,
        options: this.baseResolutionOptions
    }

    private createOutputResolutionFormData = (): IListInput<string> => {
        const resString = this.settingsStorageService.state.Settings.Video.BaseResolution;
        const baseRes = this.settingsStorageService.parseResolutionString(resString);
        let options: IListOption<string>[] = []; 

        const outputResolutionRatios = [
            1.0,
            1.25,
            (1.0/0.75),
            1.5,
            (1.0/0.6),
            1.75,
            2.0,
            2.25,
            2.5,
            2.75,
            3.0
        ];

        for (let i = 0; i < outputResolutionRatios.length; ++i) {
            const width = (baseRes.width / outputResolutionRatios[i]) | 0;
            const height = (baseRes.height / outputResolutionRatios[i]) | 0;
            const outputString = `${width}x${height}`;

            options.push({ value: outputString, description: outputString });
        }

        return {
            value: this.settingsStorageService.state.Settings.Video.OutputResolution,
            description: 'Output Resolution',
            name: '',
            enabled: true,
            visible: true,
            options
        };
    }

    outputResolutionFormData = this.createOutputResolutionFormData();

    private downscaleFilterOptions = [
        {
            description: 'Bilinear (Fastest, but blurry if scalling)',
            value: EScaleType.Bilinear
        },
        {
            description: 'Bicubic (Sharpened scaling, 16 samples)',
            value: EScaleType.Bicubic
        },
        {
            description: 'Lanczos (Sharpened scaling, 32 samples)',
            value: EScaleType.Lanczos
        }
    ];

    downscaleFilterFormData = {
        value: this.settingsStorageService.state.Settings.Video.DownscaleFilter,
        description: 'Downscale Filter',
        name: '',
        enabled: true,
        visible: true,
        options: this.downscaleFilterOptions
    }

    private fpsTypeOptions = [
        {
            description: 'Common FPS Values',
            value: EFPSType.Common
        },
        {
            description: 'Integer FPS Value',
            value: EFPSType.Integer
        },
        {
            description: 'Fractional FPS Value',
            value: EFPSType.Fraction
        }
    ];

    fpsTypeFormData = {
        value: this.settingsStorageService.state.Settings.Video.FPSType,
        description: 'FPS Type',
        name: '',
        enabled: true,
        visible: true,
        options: this.fpsTypeOptions
    }

    private fpsCommonOptions: IListOption<number>[] = [
        { description: '10', value: 0 },
        { description: '20', value: 1 },
        { description: '24 NTSC', value: 2 },
        { description: '29.97', value: 3 }, 
        { description: '30', value: 4 },
        { description: '48', value: 5 },
        { description: '59.97', value: 6 },
        { description: '60', value: 7 }
    ];

    fpsCommonValuesFormData = {
        value: this.settingsStorageService.state.Settings.Video.FPSCommon,
        description: 'Common FPS Values',
        name: '',
        enabled: true,
        visible: true,
        options: this.fpsCommonOptions
    }

    fpsIntegerFormData = {
        value: this.settingsStorageService.state.Settings.Video.FPSInt,
        description: 'Integer FPS Value',
        name: '',
        enabled: true,
        visible: true,
        minVal: 0,
        maxVal: Number.MAX_SAFE_INTEGER,
        stepVal: 1
    }

    fpsFractionNumFormData = { 
        value: this.settingsStorageService.state.Settings.Video.FPSNum,
        description: 'Fraction FPS Value',
        name: '',
        enabled: true,
        visible: true,
        minVal: 0,
        maxVal: Number.MAX_SAFE_INTEGER,
        stepVal: 1
    }

    fpsFractionDenFormData = { 
        value: this.settingsStorageService.state.Settings.Video.FPSDen,
        description: 'Denominator FPS Value',
        name: '',
        enabled: true,
        visible: true,
        minVal: 0,
        maxVal: Number.MAX_SAFE_INTEGER,
        stepVal: 1
    }

    inputBaseResolution(formData: IListInput<string>) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                BaseResolution: formData.value,
            }
        });

        this.outputResolutionFormData = this.createOutputResolutionFormData();
        this.settingsStorageService.resetVideo();
    }

    inputOutputResolution(formData: IListInput<string>) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                OutputResolution: formData.value,
            }
        });

        this.settingsStorageService.resetVideo();
    }

    inputDownscaleFilter(formData: IListInput<EScaleType>) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                DownscaleFilter: formData.value,
            }
        });

        this.settingsStorageService.resetVideo();
    }

    inputFpsType(formData: IListInput<number>) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                FPSType: formData.value,
            }
        });

        this.fpsType = formData.value;
        this.settingsStorageService.resetVideo();
    }

    inputFpsCommon(formData: IListInput<number>) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                FPSCommon: formData.value
            }
        });

        this.settingsStorageService.resetVideo();
    }

    inputFpsInteger(formData: INumberInputValue) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                FPSInt: formData.value
            }
        });

        this.settingsStorageService.resetVideo();
    }

    inputFpsFractionNum(formData: INumberInputValue) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                FPSNum: formData.value
            }
        });

        this.settingsStorageService.resetVideo();
    }

    inputFpsFractionDen(formData: INumberInputValue) {
        this.settingsStorageService.setSettings({
            Video: {
                ...this.settingsStorageService.state.Settings.Video,
                FPSDen: formData.value
            }
        });

        this.settingsStorageService.resetVideo();
    }
}
