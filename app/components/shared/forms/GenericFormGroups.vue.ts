import Vue from 'vue';
import GenericForm from './GenericForm.vue';
import { TFormData } from './Input';
import { Component, Prop } from 'vue-property-decorator';

@Component({
  components: { GenericForm }
})
export default class GenericFormGroups extends Vue {

  @Prop()
  value: TFormData;

  collapsedGroups: Dictionary<boolean> = {};

  toggleGroup(index: string) {
    this.$set(this.collapsedGroups, index, !this.collapsedGroups[index]);
  }

  onInputHandler() {
    this.$emit('input', this.value);
  }
}
