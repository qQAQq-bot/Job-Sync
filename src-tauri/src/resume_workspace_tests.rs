use tempfile::tempdir;

use crate::{resume_workspace::{self, ResumeWorkspaceDraft}, resume_workspaces::{self, CreateResumeWorkspaceRequest}};

#[test]
fn migrates_legacy_single_draft_into_first_workspace() {
  let tmp = tempdir().expect("tempdir");
  let app_data_dir = tmp.path();

  let legacy = ResumeWorkspaceDraft {
    original_resume_text: "legacy resume body".to_string(),
    ..ResumeWorkspaceDraft::default()
  };
  let saved = resume_workspace::save_draft(app_data_dir, legacy).expect("save legacy draft");
  assert_eq!(saved.original_resume_text, "legacy resume body");

  let state = resume_workspaces::get_state(app_data_dir).expect("migrate legacy state");
  assert_eq!(state.workspaces.len(), 1);
  assert_eq!(state.active_workspace_id, state.workspaces[0].id);
  assert_eq!(state.draft.original_resume_text, "legacy resume body");
}

#[test]
fn deleting_active_workspace_reassigns_active_to_remaining_workspace() {
  let tmp = tempdir().expect("tempdir");
  let app_data_dir = tmp.path();

  let first = resume_workspaces::create_workspace(
    app_data_dir,
    CreateResumeWorkspaceRequest {
      title: Some("第一份简历".to_string()),
      ..CreateResumeWorkspaceRequest::default()
    },
  )
  .expect("create first workspace");
  let first_id = first.active_workspace_id.clone();

  let second = resume_workspaces::create_workspace(
    app_data_dir,
    CreateResumeWorkspaceRequest {
      title: Some("第二份简历".to_string()),
      ..CreateResumeWorkspaceRequest::default()
    },
  )
  .expect("create second workspace");
  let second_id = second.active_workspace_id.clone();

  let state = resume_workspaces::delete_workspace(app_data_dir, &second_id).expect("delete current workspace");
  assert_eq!(state.active_workspace_id, first_id);
  assert_eq!(state.workspaces.len(), 1);
  assert_ne!(state.active_workspace_id, second_id);
}
