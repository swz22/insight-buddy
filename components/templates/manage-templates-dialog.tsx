"use client";

import { useState } from "react";
import { X, Plus, Edit2, Trash2, Star, StarOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/use-templates";
import { Database } from "@/types/supabase";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] border border-white/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold font-display text-white">
              Manage <span className="gradient-text">Templates</span>
            </h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/60 transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/[0.03] rounded-lg skeleton-gradient" />
                ))}
              </div>
            ) : (
              <>
                {!isCreating && !editingTemplate && (
                  <>
                    <Button onClick={handleCreate} variant="glow" className="mb-6 shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Template
                    </Button>

                    <div className="space-y-3">
                      {templates?.map((template) => (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-200"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white/90">{template.name}</h3>
                              {template.is_default && (
                                <span className="text-xs bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/60">{template.title_template}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(template)}
                              title={template.is_default ? "Remove as default" : "Set as default"}
                              className="text-white/60 hover:text-white hover:bg-white/10"
                            >
                              {template.is_default ? (
                                <Star className="w-4 h-4 fill-current" />
                              ) : (
                                <StarOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              className="text-white/60 hover:text-white hover:bg-white/10"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template)}
                              className="text-white/60 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}

                      {templates?.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-white/40" />
                          </div>
                          <p className="text-white/60">No templates yet. Create your first one!</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(isCreating || editingTemplate) && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="font-medium text-lg text-white mb-6">
                      {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create New Template"}
                    </h3>

                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-white/90">
                        Template Name
                      </label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Weekly Standup"
                        required
                        className="bg-white/[0.03] border-white/20 text-white placeholder:text-white/40 focus:border-purple-400/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="title_template" className="block text-sm font-medium text-white/90">
                        Title Template
                      </label>
                      <div className="space-y-2">
                        <Input
                          id="title_template"
                          value={formData.title_template}
                          onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                          placeholder="e.g., Weekly Standup - [Today's Date]"
                          required
                          className="bg-white/[0.03] border-white/20 text-white placeholder:text-white/40 focus:border-purple-400/60"
                        />
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-white/60">Quick add:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, title_template: formData.title_template + "{date}" })
                            }
                            className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                          >
                            + Date
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, title_template: formData.title_template + "{participant}" })
                            }
                            className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                          >
                            + Participant
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, title_template: formData.title_template + "{project}" })
                            }
                            className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            + Project
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, title_template: formData.title_template + "{topic}" })
                            }
                            className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                          >
                            + Topic
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description_template" className="block text-sm font-medium text-white/90">
                        Description Template <span className="text-white/40">(optional)</span>
                      </label>
                      <textarea
                        id="description_template"
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400/60 focus:bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.04] transition-all duration-200 min-h-[100px] resize-none"
                        rows={3}
                        value={formData.description_template}
                        onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                        placeholder="e.g., Weekly team sync with {participant}"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        variant="glow"
                        disabled={createTemplate.isPending || updateTemplate.isPending}
                        className="flex-1 shadow-lg"
                      >
                        {createTemplate.isPending || updateTemplate.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {editingTemplate ? "Update" : "Create"}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="glass"
                        onClick={handleCancel}
                        className="hover:border-red-400/50 hover:text-red-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
