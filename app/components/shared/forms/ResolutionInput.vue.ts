import { Component, Prop } from 'vue-property-decorator';
import { IListInput, IListOption, Input, TObsValue } from './Input';
import { Multiselect } from 'vue-multiselect';
import Vue from 'vue';

@Component({
  components: { Multiselect }
})

class ResolutionInput extends Vue {

  @Prop()
  value: string;

  @Prop({ default: true })
  showDescription: boolean;

  @Prop()
  description: string;

  @Prop({ default: false })
  disabled: boolean;

  @Prop({ default: 'Select Option or Type New Value' })
  placeholder: string;

  @Prop()
  options: IListOption<string>[];

  onInputHandler(option: IListOption<string>) {
    this.$emit('input', option);
  }

  onSearchChange(value: string) {
    this.$emit('search-change', value);
  }

  findOption(value: string) {
    let option = this.options.find((opt: IListOption<string>) => {
      return this.value === opt.value;
    });

    if (option) return option;

    if (this.value) {
      option = { value: this.value, description: this.value };
      this.options.push(option);
      return option;
    }

    return null;
  }

  getCustomResolution(search: string) {
    const match = search.match(/\d+/g) || [];
    const width = match[0] || 400;
    const height = match[1] || 400;
    const value = `${ width }x${ height }`;
    return { value, description: value };
  }

}

export default ResolutionInput;
