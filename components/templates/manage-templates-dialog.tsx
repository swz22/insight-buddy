"use client";

import { useState } from "react";
import { X, Plus, Edit2, Trash2, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/use-templates";
import { Database } from "@/types/supabase";
import { z } from "zod";

type MeetingTemplate = Database["public"]["Tables"]["meeting_templates"]["Row"];

interface ManageTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateFormData {
  name: string;
  title_template: string;
  description_template: string;
}

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title_template: z.string().min(1, "Title template is required").max(255),
  description_template: z.string().max(500).optional(),
});

export function ManageTemplatesDialog({ isOpen, onClose }: ManageTemplatesDialogProps) {
  const toast = useToast();
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    title_template: "",
    description_template: "",
  });

  if (!isOpen) return null;

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: "",
      title_template: "",
      description_template: "",
    });
  };

  const handleEdit = (template: MeetingTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      title_template: template.title_template,
      description_template: template.description_template || "",
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      title_template: "",
      description_template: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      templateFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || "Validation error");
        return;
      }
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          data: {
            name: formData.name,
            title_template: formData.title_template,
            description_template: formData.description_template || null,
          },
        });
        toast.success("Template updated successfully");
      } else {
        await createTemplate.mutateAsync({
          name: formData.name,
          title_template: formData.title_template,
          description_template: formData.description_template || null,
          participants: [],
          is_default: false,
        });
        toast.success("Template created successfully");
      }
      handleCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    }
  };

  const handleDelete = async (template: MeetingTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success("Template deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    }
  };

  const handleSetDefault = async (template: MeetingTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        data: { is_default: !template.is_default },
      });
      toast.success(template.is_default ? "Removed as default" : "Set as default template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update template");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Manage Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {!isCreating && !editingTemplate && (
                <>
                  <Button onClick={handleCreate} className="mb-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Template
                  </Button>

                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{template.name}</h3>
                            {template.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{template.title_template}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(template)}
                            title={template.is_default ? "Remove as default" : "Set as default"}
                          >
                            {template.is_default ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {templates?.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No templates yet. Create your first one!</p>
                    )}
                  </div>
                </>
              )}

              {(isCreating || editingTemplate) && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-medium mb-4">
                    {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create New Template"}
                  </h3>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      Template Name
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Weekly Standup"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="title_template" className="block text-sm font-medium mb-1">
                      Title Template
                    </label>
                    <Input
                      id="title_template"
                      value={formData.title_template}
                      onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                      placeholder="e.g., Weekly Standup - {date}"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available variables: {"{date}"}, {"{participant}"}, {"{project}"}, {"{topic}"}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description_template" className="block text-sm font-medium mb-1">
                      Description Template (optional)
                    </label>
                    <textarea
                      id="description_template"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                      rows={3}
                      value={formData.description_template}
                      onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                      placeholder="e.g., Weekly team sync with {participant}"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                      {createTemplate.isPending || updateTemplate.isPending
                        ? "Saving..."
                        : editingTemplate
                        ? "Update"
                        : "Create"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
