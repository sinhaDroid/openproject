module Bcf
  class Viewpoint < ActiveRecord::Base
    include InitializeWithUuid

    acts_as_attachable view_permission: :view_linked_issues,
                       delete_permission: :manage_bcf,
                       add_on_new_permission: :manage_bcf,
                       add_on_persisted_permission: :manage_bcf

    def self.has_uuid?(uuid)
      where(uuid: uuid).exists?
    end

    belongs_to :issue, foreign_key: :issue_id, class_name: "Bcf::Issue"
    delegate :project, :project_id, to: :issue, allow_nil: true

    def snapshot
      attachments.find_by_description('snapshot')
    end

    def snapshot=(file)
      snapshot&.destroy
      attach_files('first' => { 'file' => file, 'description' => 'snapshot' })
    end
  end
end
