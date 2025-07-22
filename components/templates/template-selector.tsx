"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTemplates } from "@/hooks/use-templates";
import { interpolateTemplate, extractTemplateVariables, TemplateVariables } from "@/lib/utils/templates";
import { Input } from "@/components/ui/input";
import { Database } from "@/types/supabase";
import { cn } from "@/lib/utils";

type MeetingTemplate = Database["public"]["Tables"]["meeting_templates"]["Row"];

interface TemplateSelectorProps {
  onSelect: (title: string, description: string) => void;
  onManageTemplates: () => void;
}

export function TemplateSelector({ onSelect, onManageTemplates }: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [variables, setVariables] = useState<TemplateVariables>({
    date: new Date(),
  });

  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find((t) => t.is_default) || templates[0];
      setSelectedTemplate(defaultTemplate);
    }
  }, [templates, selectedTemplate]);

  const handleTemplateSelect = (template: MeetingTemplate) => {
    setSelectedTemplate(template);
    setShowVariables(false);
    setVariables({ date: new Date() });
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    const title = interpolateTemplate(selectedTemplate.title_template, variables);
    const description = selectedTemplate.description_template
      ? interpolateTemplate(selectedTemplate.description_template, variables)
      : "";

    onSelect(title, description);
    setShowVariables(false);
  };

  const requiredVariables = selectedTemplate
    ? [
        ...extractTemplateVariables(selectedTemplate.title_template),
        ...extractTemplateVariables(selectedTemplate.description_template || ""),
      ].filter((v, i, self) => self.indexOf(v) === i && v !== "date")
    : [];

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-white/[0.03] rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-white/90">Meeting Template</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onManageTemplates}
          className="text-white/60 hover:text-white"
        >
          <Settings className="w-4 h-4 mr-1" />
          Manage
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {templates?.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant={selectedTemplate?.id === template.id ? "glow" : "glass"}
            size="sm"
            className={cn("justify-start", selectedTemplate?.id === template.id && "shadow-md")}
            onClick={() => handleTemplateSelect(template)}
          >
            <FileText className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">{template.name}</span>
          </Button>
        ))}
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={onManageTemplates}
          className="justify-start hover:border-purple-400/60"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {selectedTemplate && (
        <>
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-lg p-3 space-y-2 border border-white/10">
            <p className="text-sm text-white/70">
              <strong className="text-white/90">Title:</strong> {selectedTemplate.title_template}
            </p>
            {selectedTemplate.description_template && (
              <p className="text-sm text-white/70">
                <strong className="text-white/90">Description:</strong> {selectedTemplate.description_template}
              </p>
            )}
          </div>

          {requiredVariables.length > 0 && (
            <>
              {!showVariables ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariables(true)}
                  className="w-full"
                >
                  Customize Variables
                </Button>
              ) : (
                <div className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Template Variables</h4>
                    <button
                      type="button"
                      onClick={() => setShowVariables(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {requiredVariables.map((variable) => (
                    <div key={variable}>
                      <label htmlFor={variable} className="block text-sm font-medium mb-1 capitalize">
                        {variable}
                      </label>
                      <Input
                        id={variable}
                        type="text"
                        value={(variables[variable] as string) || ""}
                        onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                        placeholder={`Enter ${variable}...`}
                      />
                    </div>
                  ))}

                  <Button type="button" onClick={handleApplyTemplate} size="sm" className="w-full">
                    Apply Template
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
