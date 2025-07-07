
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Copy } from "lucide-react";
import { type ReceiptCustomization } from "./print-receipt";

interface ReceiptTemplate {
  id: string;
  name: string;
  description: string;
  settings: ReceiptCustomization;
  createdAt: Date;
}

interface ReceiptTemplateManagerProps {
  currentSettings: ReceiptCustomization;
  onApplyTemplate: (settings: ReceiptCustomization) => void;
}

export const ReceiptTemplateManager: React.FC<ReceiptTemplateManagerProps> = ({
  currentSettings,
  onApplyTemplate
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>(() => {
    const saved = localStorage.getItem('receiptTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const saveTemplates = (newTemplates: ReceiptTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('receiptTemplates', JSON.stringify(newTemplates));
  };

  const saveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    const newTemplate: ReceiptTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || 'Custom receipt template',
      settings: { ...currentSettings },
      createdAt: new Date()
    };

    const newTemplates = [...templates, newTemplate];
    saveTemplates(newTemplates);

    setNewTemplateName('');
    setNewTemplateDesc('');
    setIsDialogOpen(false);

    toast({
      title: "Template Saved",
      description: `"${newTemplate.name}" has been saved successfully`
    });
  };

  const deleteTemplate = (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id);
    saveTemplates(newTemplates);
    toast({
      title: "Template Deleted",
      description: "Template has been removed"
    });
  };

  const duplicateTemplate = (template: ReceiptTemplate) => {
    const duplicated: ReceiptTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date()
    };

    const newTemplates = [...templates, duplicated];
    saveTemplates(newTemplates);

    toast({
      title: "Template Duplicated",
      description: `"${duplicated.name}" has been created`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receipt Templates
          </span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Settings as Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template from your current receipt settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Store Default, Promotional, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="templateDesc">Description (Optional)</Label>
                  <Input
                    id="templateDesc"
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Brief description of this template"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentAsTemplate}>
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage and apply saved receipt templates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates saved yet</p>
            <p className="text-sm">Save your current settings to create your first template</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="text-xs text-gray-500">
                      Created: {template.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onApplyTemplate(template.settings);
                        toast({
                          title: "Template Applied",
                          description: `"${template.name}" settings have been applied`
                        });
                      }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateTemplate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptTemplateManager;
