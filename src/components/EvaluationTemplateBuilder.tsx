import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Edit,
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EvaluationCriteria {
  id: string;
  template_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  weight: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  children?: EvaluationCriteria[];
}

interface EvaluationTemplateBuilderProps {
  roleId: string;
  roleName: string;
  areaName: string;
  onClose: () => void;
}

export default function EvaluationTemplateBuilder({ 
  roleId, 
  roleName, 
  areaName, 
  onClose 
}: EvaluationTemplateBuilderProps) {
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isAddingCriteria, setIsAddingCriteria] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [parentCriteria, setParentCriteria] = useState<string | null>(null);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: ''
  });
  
  const [criteriaForm, setCriteriaForm] = useState({
    name: '',
    description: '',
    weight: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplate();
  }, [roleId]);

  const fetchTemplate = async () => {
    setLoading(true);
    
    // Fetch existing template
    const { data: templateData } = await supabase
      .from('evaluation_templates')
      .select('*')
      .eq('role_id', roleId)
      .eq('is_active', true)
      .maybeSingle();

    if (templateData) {
      setTemplate(templateData);
      setTemplateForm({
        name: templateData.name,
        description: templateData.description || ''
      });
      
      // Fetch criteria
      const { data: criteriaData } = await supabase
        .from('evaluation_criteria_templates')
        .select('*')
        .eq('template_id', templateData.id)
        .order('order_index');

      if (criteriaData) {
        const hierarchicalCriteria = buildHierarchy(criteriaData);
        setCriteria(hierarchicalCriteria);
      }
    } else {
      // No template exists, prepare for creation
      setTemplateForm({
        name: `${roleName} Evaluation Template`,
        description: `Evaluation template for ${roleName} role in ${areaName} area`
      });
    }
    
    setLoading(false);
  };

  const buildHierarchy = (flatCriteria: EvaluationCriteria[]): EvaluationCriteria[] => {
    const criteriaMap = new Map<string, EvaluationCriteria>();
    const rootCriteria: EvaluationCriteria[] = [];

    // First pass: create map and initialize children arrays
    flatCriteria.forEach(criteria => {
      criteriaMap.set(criteria.id, { ...criteria, children: [] });
    });

    // Second pass: build hierarchy
    flatCriteria.forEach(criteria => {
      const criteriaWithChildren = criteriaMap.get(criteria.id)!;
      
      if (criteria.parent_id) {
        const parent = criteriaMap.get(criteria.parent_id);
        if (parent) {
          parent.children!.push(criteriaWithChildren);
        }
      } else {
        rootCriteria.push(criteriaWithChildren);
      }
    });

    return rootCriteria;
  };

  const handleCreateTemplate = async () => {
    const { data, error } = await supabase
      .from('evaluation_templates')
      .insert({
        name: templateForm.name,
        description: templateForm.description,
        role_id: roleId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTemplate(data);
      setIsEditingTemplate(false);
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!template) return;

    const { error } = await supabase
      .from('evaluation_templates')
      .update({
        name: templateForm.name,
        description: templateForm.description
      })
      .eq('id', template.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTemplate(prev => prev ? { ...prev, name: templateForm.name, description: templateForm.description } : null);
      setIsEditingTemplate(false);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    }
  };

  const handleAddCriteria = async () => {
    if (!template) return;

    // Calculate order index
    const siblings = parentCriteria 
      ? criteria.find(c => c.id === parentCriteria)?.children || []
      : criteria;
    const orderIndex = siblings.length;

    const { data, error } = await supabase
      .from('evaluation_criteria_templates')
      .insert({
        template_id: template.id,
        parent_id: parentCriteria,
        name: criteriaForm.name,
        description: criteriaForm.description,
        weight: criteriaForm.weight,
        order_index: orderIndex
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchTemplate(); // Refresh the data
      setIsAddingCriteria(false);
      setCriteriaForm({ name: '', description: '', weight: 0 });
      setParentCriteria(null);
      toast({
        title: "Success",
        description: "Criteria added successfully",
      });
    }
  };

  const handleUpdateCriteria = async () => {
    if (!editingCriteria) return;

    const { error } = await supabase
      .from('evaluation_criteria_templates')
      .update({
        name: criteriaForm.name,
        description: criteriaForm.description,
        weight: criteriaForm.weight
      })
      .eq('id', editingCriteria.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchTemplate(); // Refresh the data
      setEditingCriteria(null);
      setCriteriaForm({ name: '', description: '', weight: 0 });
      toast({
        title: "Success",
        description: "Criteria updated successfully",
      });
    }
  };

  const handleDeleteCriteria = async (criteriaId: string) => {
    const { error } = await supabase
      .from('evaluation_criteria_templates')
      .delete()
      .eq('id', criteriaId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await fetchTemplate(); // Refresh the data
      toast({
        title: "Success",
        description: "Criteria deleted successfully",
      });
    }
  };

  const openAddCriteria = (parentId: string | null = null) => {
    setParentCriteria(parentId);
    setCriteriaForm({ name: '', description: '', weight: 0 });
    setIsAddingCriteria(true);
  };

  const openEditCriteria = (criteria: EvaluationCriteria) => {
    setEditingCriteria(criteria);
    setCriteriaForm({
      name: criteria.name,
      description: criteria.description || '',
      weight: criteria.weight
    });
  };

  const toggleExpanded = (criteriaId: string) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criteriaId)) {
      newExpanded.delete(criteriaId);
    } else {
      newExpanded.add(criteriaId);
    }
    setExpandedCriteria(newExpanded);
  };

  const calculateTotalWeight = (criteriaList: EvaluationCriteria[]): number => {
    return criteriaList.reduce((sum, criteria) => sum + criteria.weight, 0);
  };

  const renderCriteria = (criteriaList: EvaluationCriteria[], level: number = 0) => {
    const totalWeight = calculateTotalWeight(criteriaList);
    const hasWeightError = Math.abs(totalWeight - 100) > 0.01 && criteriaList.length > 0;

    return (
      <div className={`space-y-2 ${level > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
        {level === 0 && criteriaList.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Main Criteria</span>
            <Badge variant={hasWeightError ? "destructive" : "default"}>
              Total Weight: {totalWeight.toFixed(1)}%
            </Badge>
          </div>
        )}
        
        {criteriaList.map((criteria) => {
          const isExpanded = expandedCriteria.has(criteria.id);
          const hasChildren = criteria.children && criteria.children.length > 0;
          const childrenWeight = hasChildren ? calculateTotalWeight(criteria.children) : 0;
          const hasChildrenWeightError = hasChildren && Math.abs(childrenWeight - 100) > 0.01;

          return (
            <div key={criteria.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  {hasChildren && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(criteria.id)}
                      className="p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{criteria.name}</span>
                      <Badge variant="secondary">{criteria.weight}%</Badge>
                    </div>
                    {criteria.description && (
                      <p className="text-sm text-muted-foreground mt-1">{criteria.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddCriteria(criteria.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditCriteria(criteria)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCriteria(criteria.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {hasChildren && isExpanded && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Sub-criteria</span>
                    <Badge variant={hasChildrenWeightError ? "destructive" : "default"}>
                      Total Weight: {childrenWeight.toFixed(1)}%
                    </Badge>
                  </div>
                  {renderCriteria(criteria.children, level + 1)}
                </div>
              )}
            </div>
          );
        })}
        
        <Button
          variant="outline"
          onClick={() => openAddCriteria(level === 0 ? null : undefined)}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {level === 0 ? 'Main' : 'Sub'} Criteria
        </Button>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Template Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{template ? template.name : 'Create Evaluation Template'}</CardTitle>
              <CardDescription>
                Role: {roleName} • Area: {areaName}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {template && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingTemplate(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        {template?.description && (
          <CardContent>
            <p className="text-muted-foreground">{template.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Create Template if none exists */}
      {!template && (
        <Card>
          <CardHeader>
            <CardTitle>Create Evaluation Template</CardTitle>
            <CardDescription>
              Set up the evaluation structure for this role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Describe the evaluation template"
              />
            </div>
            <Button onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Criteria Management */}
      {template && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Criteria</CardTitle>
            <CardDescription>
              Define the criteria and their weights for evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {criteria.length > 0 ? renderCriteria(criteria) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No criteria defined yet</p>
                <Button onClick={() => openAddCriteria()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Criteria
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Edit Dialog */}
      <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTemplateName">Template Name</Label>
              <Input
                id="editTemplateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editTemplateDescription">Description</Label>
              <Textarea
                id="editTemplateDescription"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingTemplate(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Criteria Add/Edit Dialog */}
      <Dialog open={isAddingCriteria || !!editingCriteria} onOpenChange={(open) => {
        if (!open) {
          setIsAddingCriteria(false);
          setEditingCriteria(null);
          setCriteriaForm({ name: '', description: '', weight: 0 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCriteria ? 'Edit Criteria' : 'Add Criteria'}
            </DialogTitle>
            <DialogDescription>
              {parentCriteria ? 'Add a sub-criteria' : 'Add a main criteria'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="criteriaName">Criteria Name</Label>
              <Input
                id="criteriaName"
                value={criteriaForm.name}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
                placeholder="e.g., Communication Skills"
              />
            </div>
            <div>
              <Label htmlFor="criteriaDescription">Description</Label>
              <Textarea
                id="criteriaDescription"
                value={criteriaForm.description}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, description: e.target.value })}
                placeholder="Describe what this criteria evaluates"
              />
            </div>
            <div>
              <Label htmlFor="criteriaWeight">Weight (%)</Label>
              <Input
                id="criteriaWeight"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={criteriaForm.weight}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, weight: parseFloat(e.target.value) || 0 })}
                placeholder="Enter weight percentage"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsAddingCriteria(false);
                setEditingCriteria(null);
              }}>
                Cancel
              </Button>
              <Button onClick={editingCriteria ? handleUpdateCriteria : handleAddCriteria}>
                {editingCriteria ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}