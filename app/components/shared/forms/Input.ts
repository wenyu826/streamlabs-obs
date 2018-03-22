import _ from 'lodash';
import Vue from 'vue';
import { Prop } from 'vue-property-decorator';
import * as obs from '../../../../obs-api';
import {
  isListProperty,
  isEditableListProperty,
  isNumberProperty,
  isTextProperty,
  isFontProperty,
  isPathProperty
} from '../../../util/properties-type-guards';

/**
 * OBS values that frontend application can change
 */
export declare type TObsValue = number | string | boolean | IFont | TObsStringList;

/** 
 * OBS bindings don't describe a union of different sub-property
 * types so we define our own.
 */
export declare type TSubPropertyType = 
  obs.EEditableListType |
  obs.EPathType         |
  obs.ETextType         |
  obs.ENumberType;

export enum ECustomTypes {
  /* We start at a thousand to avoid collision with obs types */
  ResolutionInput = 1000
}

/**
 * common interface for OBS objects properties
 */
export interface IFormInput<TValueType> {
  value: TValueType;
  name: string;
  description: string;
  showDescription?: boolean;
  enabled?: boolean;
  visible?: boolean;
  masked?: boolean;
  type?: obs.EPropertyType | ECustomTypes;
  subType?: TSubPropertyType;
}

export declare type TFormData = (IFormInput<TObsValue> | IListInput<TObsValue>)[];

export interface IListInput<TValue> extends IFormInput<TValue> {
  options: IListOption<TValue>[];
}

export interface IListOption<TValue> {
  description: string;
  value: TValue;
}

export interface IPathInputValue extends IFormInput<string> {
  filters: IElectronOpenDialogFilter[];
}

export interface INumberInputValue extends IFormInput<number> {
  minVal: number;
  maxVal: number;
  stepVal: number;
}

export interface ISliderInputValue extends INumberInputValue {
  usePercentages?: boolean;
}

export interface ITextInputValue extends IFormInput<string> {
  multiline: boolean;
}

export interface IBitmaskInput extends IFormInput<number> {
  size: number;
}

export interface IFont {
  face?: string;
  flags?: number;
  size?: number;
  path?: string;
}

export interface IGoogleFont {
  face: string;
  flags: number;
  path?: string;
  size?: string;
}

export type TObsStringList = { value: string }[];

export interface IEditableListInputValue extends IFormInput<TObsStringList> {
  defaultPath?: string;
  filters?: IElectronOpenDialogFilter[];
}

export interface IElectronOpenDialogFilter {
  name: string;
  extensions: string[];
}

function parsePathFilters(filterStr: string): IElectronOpenDialogFilter[] {
  const filters = _.compact(filterStr.split(';;'));

  // Browser source uses *.*
  if (filterStr === '*.*') {
    return [
      {
        name: 'All Files',
        extensions: ['*']
      }
    ];
  }

  return filters.map(filter => {
    const match = filter.match(/^(.*)\((.*)\)$/);
    const desc = _.trim(match[1]);
    let types = match[2].split(' ');

    types = types.map(type => {
      return type.match(/^\*\.(.+)$/)[1];
    });

    // This is the format that electron file dialogs use
    return {
      name: desc,
      extensions: types
    };
  });
}

export function getPropertiesFormData(obsSource: obs.IConfigurable): TFormData {

  setupSourceDefaults(obsSource);
  
  const formData: TFormData = [];
  const obsProps = obsSource.properties;
  const obsSettings = obsSource.settings;

  if (!obsProps) return null;

  let obsProp = obsProps.first();
  do {
    const formItem: IFormInput<TObsValue> = {
      value: obsSettings[obsProp.name],
      name: obsProp.name,
      description: obsProp.description,
      enabled: obsProp.enabled,
      visible: obsProp.visible,
      type: obsProp.type
    };

    // handle property details

    if (isListProperty(obsProp)) {
      const options: IListOption<any>[] = obsProp.details.items.map(option => {
        return { value: option.value, description: option.name };
      });

      Object.assign(formItem as IListInput<TObsValue>, { options });
    }

    if (isNumberProperty(obsProp)) {
      Object.assign(formItem as INumberInputValue, {
        subType: obsProp.details.type,
        minVal: obsProp.details.min,
        maxVal: obsProp.details.max,
        stepVal: obsProp.details.step
      });
    }

    if (isEditableListProperty(obsProp)) {
      Object.assign(formItem as IEditableListInputValue, {
        subType: obsProp.details.type,
        filters: parsePathFilters(obsProp.details.filter),
        defaultPath: obsProp.details.defaultPath
      });
    }

    if (isPathProperty(obsProp)) {
      Object.assign(formItem as IPathInputValue, {
        subType: obsProp.details.type,
        filters: parsePathFilters(obsProp.details.filter),
        defaultPath: obsProp.details.defaultPath
      });
    }

    if (isTextProperty(obsProp)) {
      Object.assign(formItem as ITextInputValue, {
        subType: obsProp.details.type,
        multiline: obsProp.details.type === obs.ETextType.Multiline,
        masked: obsProp.details.type === obs.ETextType.Password
      });
    }

    if (isFontProperty(obsProp)) {
      (formItem as IFormInput<IFont>).value.path = obsSource.settings['custom_font'];
    }

    formData.push(formItem);
  } while (obsProp = obsProp.next());

  return formData;
}


export function setPropertiesFormData(obsSource: obs.IConfigurable, form: TFormData) {
  const buttons: IFormInput<boolean>[] = [];
  const formInputs: IFormInput<TObsValue>[] = [];
  const properties = obsSource.properties;

  form.forEach(item => {
    if (item.type === obs.EPropertyType.Button) {
      buttons.push(item as IFormInput<boolean>);
    } else {
      formInputs.push(item);
    }
  });

  const settings: Dictionary<any> = {};
  formInputs.forEach(property => {
    settings[property.name] = property.value;

    if (property.type === obs.EPropertyType.Font) {
      settings['custom_font'] = (property.value as IFont).path;
      delete settings[property.name]['path'];
    }
  });

  obsSource.update(settings);

  buttons.forEach(buttonInput => {
    if (!buttonInput.value) return;
    const obsButtonProp = properties.get(buttonInput.name) as obs.IButtonProperty;
    obsButtonProp.buttonClicked(obsSource);
  });
}


export function setupSourceDefaults(obsSource: obs.IConfigurable) {
  const propSettings = obsSource.settings;
  const defaultSettings = {};
  const properties = obsSource.properties;

  if (!properties) return;

  let obsProp = properties.first();
  do {
    if (!isListProperty(obsProp)) 
      continue;

    const items = obsProp.details.items;

    if (items.length === 0)
      continue;

    /* If setting isn't set at all, set to first element. */
    if (propSettings[obsProp.name] === void 0) {
      defaultSettings[obsProp.name] = items[0].value;
      continue;
    }

    let validItem = false;

    /* If there is a setting, make sure it's a valid item */
    for (let i = 0; i < items.length; ++i) {
      if (propSettings[obsProp.name] === items[i].value) {
        validItem = true;
        break;
      }
    }

    if (!validItem)
      defaultSettings[obsProp.name] = items[0].value;

  } while (obsProp = obsProp.next());
  const needUpdate = Object.keys(defaultSettings).length > 0;
  if (needUpdate) obsSource.update(defaultSettings);
}


export abstract class Input<TValueType> extends Vue {

  @Prop()
  value: TValueType;

  emitInput(eventData: TValueType) {
    this.$emit('input', eventData);
  }

}
