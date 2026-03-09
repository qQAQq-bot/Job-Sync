<script setup lang="ts">
import type { ResumeBasicProfile } from "../../lib/resumeWorkspace";

defineProps<{
  profile: ResumeBasicProfile;
}>();

const emit = defineEmits<{
  (e: "update:field", field: keyof ResumeBasicProfile, value: string): void;
}>();
</script>

<template>
  <section class="ui-panel-muted p-4">
    <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">基础信息</div>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">姓名</div>
        <input :value="profile.name" class="ui-input w-full" @input="emit('update:field', 'name', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">性别</div>
        <input :value="profile.gender" class="ui-input w-full" @input="emit('update:field', 'gender', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">年龄 / 出生年月</div>
        <input :value="profile.birth_or_age" class="ui-input w-full" @input="emit('update:field', 'birth_or_age', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">学历</div>
        <input :value="profile.education" class="ui-input w-full" @input="emit('update:field', 'education', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">电话</div>
        <input :value="profile.phone" class="ui-input w-full" @input="emit('update:field', 'phone', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="text-xs font-medium text-content-muted">邮箱</div>
        <input :value="profile.email" class="ui-input w-full" @input="emit('update:field', 'email', ($event.target as HTMLInputElement).value)" />
      </label>
    </div>
  </section>
</template>
