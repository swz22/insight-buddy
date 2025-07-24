"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Briefcase,
  Type,
  Plus,
  X,
  GripVertical,
  FileText,
  Settings,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";

export type TemplateFieldType = "text" | "date" | "person" | "project";

export interface TemplateField {
  id: string;
  type: TemplateFieldType;
  value: string;
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  fields: TemplateField[];
  isDefault?: boolean;
}

const fieldConfigs: Record<
  TemplateFieldType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    defaultValue: () => string;
    placeholder: string;
  }
> = {
  text: {
    icon: Type,
    label: "Text",
    defaultValue: () => "",
    placeholder: "Enter text...",
  },
  date: {
    icon: Calendar,
    label: "Date",
    defaultValue: () => format(new Date(), "yyyy-MM-dd"),
    placeholder: "Select date...",
  },
  person: {
    icon: User,
    label: "Person",
    defaultValue: () => "",
    placeholder: "Enter person name...",
  },
  project: {
    icon: Briefcase,
    label: "Project",
    defaultValue: () => "",
    placeholder: "Enter project name...",
  },
};

const defaultTemplates: Template[] = [
  {
    id: "weekly",
    name: "Weekly Standup",
    isDefault: true,
    fields: [
      { id: "1", type: "text", value: "Weekly Standup" },
      { id: "2", type: "date", value: format(new Date(), "yyyy-MM-dd") },
    ],
  },
  {
    id: "oneOnOne",
    name: "1-on-1",
    fields: [
      { id: "1", type: "text", value: "1-on-1 with" },
      { id: "2", type: "person", value: "", placeholder: "Enter name..." },
      { id: "3", type: "date", value: format(new Date(), "yyyy-MM-dd") },
    ],
  },
  {
    id: "client",
    name: "Client Meeting",
    fields: [
      { id: "1", type: "text", value: "Client Meeting:" },
      { id: "2", type: "project", value: "", placeholder: "Project name..." },
      { id: "3", type: "date", value: format(new Date(), "yyyy-MM-dd") },
    ],
  },
  {
    id: "project",
    name: "Project Review",
    fields: [
      { id: "1", type: "project", value: "", placeholder: "Project name..." },
      { id: "2", type: "text", value: "Review" },
      { id: "3", type: "date", value: format(new Date(), "yyyy-MM-dd") },
    ],
  },
];

interface TemplateSystemProps {
  onTitleChange: (title: string) => void;
  previousParticipants?: string[];
  previousProjects?: string[];
}

export function TemplateSystem({
  onTitleChange,
  previousParticipants = [],
  previousProjects = [],
}: TemplateSystemProps) {
  const toast = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("weekly");
  const [currentFields, setCurrentFields] = useState<TemplateField[]>([]);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const allTemplates = [...defaultTemplates, ...customTemplates];

  useEffect(() => {
    const template = allTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      const newFields = template.fields.map((field) => ({
        ...field,
        id: `${field.id}-${Date.now()}-${Math.random()}`,
      }));
      setCurrentFields(newFields);
      const title = generateTitle(newFields);
      onTitleChange(title);
    }
  }, [selectedTemplateId]);

  const generateTitle = (fields: TemplateField[]): string => {
    return fields
      .map((field) => {
        if (field.type === "date" && field.value) {
          try {
            return format(new Date(field.value), "MMM d, yyyy");
          } catch {
            return field.value;
          }
        }
        return field.value;
      })
      .filter(Boolean)
      .join(" - ");
  };

  const addField = (type: TemplateFieldType) => {
    const config = fieldConfigs[type];
    const newField: TemplateField = {
      id: `field-${Date.now()}-${Math.random()}`,
      type,
      value: type === "text" ? "" : config.defaultValue(),
      placeholder: config.placeholder,
    };
    const newFields = [...currentFields, newField];
    setCurrentFields(newFields);
    setShowFieldMenu(false);
    setSelectedTemplateId("custom");
    const title = generateTitle(newFields);
    onTitleChange(title);
  };

  const updateField = (id: string, value: string) => {
    const newFields = currentFields.map((field) => (field.id === id ? { ...field, value } : field));
    setCurrentFields(newFields);
    const title = generateTitle(newFields);
    onTitleChange(title);
  };

  const removeField = (id: string) => {
    const newFields = currentFields.filter((field) => field.id !== id);
    setCurrentFields(newFields);
    const title = generateTitle(newFields);
    onTitleChange(title);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(currentFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCurrentFields(items);
    const title = generateTitle(items);
    onTitleChange(title);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (templateFields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }

    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: templateName,
      fields: templateFields,
    };

    if (editingTemplate) {
      setCustomTemplates(
        customTemplates.map((t) => (t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t))
      );
      toast.success("Template updated");
    } else {
      setCustomTemplates([...customTemplates, newTemplate]);
      toast.success("Template created");
    }

    setIsCreatingTemplate(false);
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateFields([]);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm("Delete this template?")) return;
    setCustomTemplates(customTemplates.filter((t) => t.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId("weekly");
    }
    toast.success("Template deleted");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-white/90">Choose Template</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateManager(true)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Settings className="w-4 h-4 mr-1" />
            Manage
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allTemplates.map((template) => (
            <Button
              key={template.id}
              type="button"
              variant={selectedTemplateId === template.id ? "glow" : "glass"}
              size="sm"
              className={cn("justify-start", selectedTemplateId === template.id && "shadow-md")}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <FileText className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">{template.name}</span>
            </Button>
          ))}
          <Button
            type="button"
            variant={selectedTemplateId === "custom" ? "glow" : "glass"}
            size="sm"
            className={cn("justify-start", selectedTemplateId === "custom" && "shadow-md")}
            onClick={() => {
              setSelectedTemplateId("custom");
              setCurrentFields([]);
            }}
          >
            <Plus className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Custom</span>
          </Button>
        </div>
      </div>

      {/* Field Builder */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-white/90">Build Your Title</label>

        {/* Add Field Button */}
        <div className="relative">
          {!showFieldMenu ? (
            <Button
              type="button"
              variant="glass"
              onClick={() => setShowFieldMenu(true)}
              className="w-full justify-start hover:border-purple-400/60"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/20">
              {Object.entries(fieldConfigs).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => addField(type as TemplateFieldType)}
                    className="justify-start hover:bg-purple-500/10 hover:border-purple-400/50"
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {config.label}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFieldMenu(false)}
                className="hover:bg-red-500/10 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Fields */}
        {currentFields.length > 0 && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fields">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "space-y-2 rounded-lg p-2 transition-colors",
                    snapshot.isDraggingOver && "bg-white/[0.02]"
                  )}
                >
                  {currentFields.map((field, index) => {
                    const config = fieldConfigs[field.type];
                    const Icon = config.icon;

                    return (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/20 group",
                              "hover:border-white/30 transition-all duration-200",
                              snapshot.isDragging && "shadow-lg shadow-purple-500/20 border-purple-400/50"
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-move text-white/40 hover:text-white/60"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-white/60" />
                            </div>

                            {field.type === "date" ? (
                              <div className="flex-1 relative date-input-wrapper">
                                <Input
                                  type="date"
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, e.target.value)}
                                  className="h-8 pr-10 bg-white/[0.03] border-white/20 text-white smooth-border relative z-10"
                                  onMouseDown={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    setTimeout(() => {
                                      if (document.activeElement !== input) {
                                        input.focus();
                                      }
                                    }, 0);
                                  }}
                                  style={{ colorScheme: "dark" }}
                                />
                              </div>
                            ) : field.type === "person" ? (
                              <div className="flex-1">
                                <Input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="h-8 bg-white/[0.03] border-white/20 text-white placeholder:text-white/40"
                                  list={`participants-${field.id}`}
                                />
                                <datalist id={`participants-${field.id}`}>
                                  {previousParticipants.map((p) => (
                                    <option key={p} value={p} />
                                  ))}
                                </datalist>
                              </div>
                            ) : field.type === "project" ? (
                              <div className="flex-1">
                                <Input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="h-8 bg-white/[0.03] border-white/20 text-white placeholder:text-white/40"
                                  list={`projects-${field.id}`}
                                />
                                <datalist id={`projects-${field.id}`}>
                                  {previousProjects.map((p) => (
                                    <option key={p} value={p} />
                                  ))}
                                </datalist>
                              </div>
                            ) : (
                              <Input
                                type="text"
                                value={field.value}
                                onChange={(e) => updateField(field.id, e.target.value)}
                                placeholder={field.placeholder || "Enter text..."}
                                className="flex-1 h-8 bg-white/[0.03] border-white/20 text-white placeholder:text-white/40"
                              />
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(field.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Preview */}
        {currentFields.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Preview</label>
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30">
              <p className="text-white/90 font-medium">
                {generateTitle(currentFields) || "Your title will appear here..."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Template Manager Dialog */}
      <AnimatePresence>
        {showTemplateManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTemplateManager(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] border border-white/10 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold font-display text-white">
                  Template <span className="gradient-text">Library</span>
                </h2>
                <button
                  onClick={() => setShowTemplateManager(false)}
                  className="text-white/40 hover:text-white/60 transition-colors p-1 hover:bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!isCreatingTemplate && !editingTemplate ? (
                  <>
                    <Button onClick={() => setIsCreatingTemplate(true)} variant="glow" className="mb-6 shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Template
                    </Button>

                    <div className="space-y-3">
                      {customTemplates.map((template) => (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-200"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-white/90 mb-2">{template.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              {template.fields.map((field, index) => (
                                <span key={index} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                                  {field.type === "text" ? field.value || "Text" : field.type}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplateId(template.id);
                                setShowTemplateManager(false);
                              }}
                              className="text-white/60 hover:text-white hover:bg-white/10"
                            >
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateName(template.name);
                                setTemplateFields([...template.fields]);
                              }}
                              className="text-white/60 hover:text-white hover:bg-white/10"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTemplate(template.id)}
                              className="text-white/60 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}

                      {customTemplates.length === 0 && (
                        <div className="text-center py-12 text-white/50">
                          No custom templates yet. Create your first one!
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <h3 className="font-medium text-lg text-white">
                      {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create New Template"}
                    </h3>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/90">Template Name</label>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Project Kickoff"
                        className="bg-white/[0.03] border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>

                    {/* Template builder */}
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="glass"
                        onClick={() => {
                          const newField: TemplateField = {
                            id: `field-${Date.now()}`,
                            type: "text",
                            value: "",
                            placeholder: "Enter text...",
                          };
                          setTemplateFields([...templateFields, newField]);
                        }}
                        className="w-full justify-start"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </Button>

                      {templateFields.map((field, index) => {
                        const config = fieldConfigs[field.type];
                        const Icon = config.icon;
                        return (
                          <div
                            key={field.id}
                            className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/20"
                          >
                            <Icon className="w-4 h-4 text-white/60" />
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newType = e.target.value as TemplateFieldType;
                                setTemplateFields(
                                  templateFields.map((f) =>
                                    f.id === field.id
                                      ? { ...f, type: newType, value: fieldConfigs[newType].defaultValue() }
                                      : f
                                  )
                                );
                              }}
                              className="h-8 px-3 rounded-lg bg-black/60 border border-white/20 text-white focus:outline-none focus:border-purple-400/60 hover:border-white/30 transition-all duration-200 cursor-pointer appearance-none"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 0.7rem center",
                                paddingRight: "2.5rem",
                              }}
                            >
                              {Object.entries(fieldConfigs).map(([type, config]) => (
                                <option key={type} value={type} className="bg-black text-white">
                                  {config.label}
                                </option>
                              ))}
                            </select>
                            {field.type === "text" && (
                              <Input
                                value={field.value}
                                onChange={(e) => {
                                  setTemplateFields(
                                    templateFields.map((f) => (f.id === field.id ? { ...f, value: e.target.value } : f))
                                  );
                                }}
                                placeholder="Default text..."
                                className="flex-1 h-8 bg-white/[0.03] border-white/20 text-white"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTemplateFields(templateFields.filter((f) => f.id !== field.id))}
                              className="hover:bg-red-500/10 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="glow" onClick={saveTemplate} className="flex-1 shadow-lg">
                        <Save className="w-4 h-4 mr-2" />
                        {editingTemplate ? "Update" : "Save"} Template
                      </Button>
                      <Button
                        type="button"
                        variant="glass"
                        onClick={() => {
                          setIsCreatingTemplate(false);
                          setEditingTemplate(null);
                          setTemplateName("");
                          setTemplateFields([]);
                        }}
                        className="hover:border-red-400/50 hover:text-red-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
