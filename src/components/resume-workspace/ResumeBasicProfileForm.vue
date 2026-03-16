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
  <section class="resume-paper-panel-soft">
    <div class="max-w-2xl">
      <div class="resume-paper-title">基础信息</div>
      <div class="mt-2 text-lg font-semibold tracking-[-0.02em] text-content-primary">完善简历的识别信息</div>
      <p class="mt-2 resume-paper-copy">
        这些字段会和正文内容一起作为简历工作区的基础资料，用于后续诊断与成稿生成。
      </p>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <label class="space-y-1">
        <div class="resume-paper-label">姓名</div>
        <input :value="profile.name" class="resume-paper-input" @input="emit('update:field', 'name', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="resume-paper-label">性别</div>
        <input :value="profile.gender" class="resume-paper-input" @input="emit('update:field', 'gender', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="resume-paper-label">年龄 / 出生年月</div>
        <input :value="profile.birth_or_age" class="resume-paper-input" @input="emit('update:field', 'birth_or_age', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="resume-paper-label">学历</div>
        <input :value="profile.education" class="resume-paper-input" @input="emit('update:field', 'education', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="resume-paper-label">电话</div>
        <input :value="profile.phone" class="resume-paper-input" @input="emit('update:field', 'phone', ($event.target as HTMLInputElement).value)" />
      </label>
      <label class="space-y-1">
        <div class="resume-paper-label">邮箱</div>
        <input :value="profile.email" class="resume-paper-input" @input="emit('update:field', 'email', ($event.target as HTMLInputElement).value)" />
      </label>
    </div>
  </section>
</template>
