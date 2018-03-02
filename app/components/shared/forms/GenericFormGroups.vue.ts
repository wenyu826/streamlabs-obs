import Vue from 'vue';
import GenericForm from './GenericForm.vue';
import { Component, Prop } from 'vue-property-decorator';

@Component({
  components: { GenericForm }
})
export default class GenericFormGroups extends Vue {

  @Prop()
  value: any[];

  collapsedGroups: Dictionary<boolean> = {};

  toggleGroup(index: string) {
    this.$set(this.collapsedGroups, index, !this.collapsedGroups[index]);
  }

  onInputHandler() {
    this.$emit('input', this.value);
  }
}
