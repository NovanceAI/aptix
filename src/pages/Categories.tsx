import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target,
  Weight,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Criteria {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  criteria: Criteria[];
}

const mockCategories: Category[] = [
  {
    id: "1",
    name: "Technical Skills",
    description: "Assessment of technical competencies and expertise",
    criteria: [
      {
        id: "1-1",
        name: "Code Quality",
        description: "Writing clean, maintainable, and efficient code",
        weight: 30
      },
      {
        id: "1-2",
        name: "Problem Solving",
        description: "Ability to solve complex technical problems",
        weight: 25
      },
      {
        id: "1-3",
        name: "Learning Agility",
        description: "Adapting to new technologies and methodologies",
        weight: 20
      }
    ]
  },
  {
    id: "2",
    name: "Communication",
    description: "Interpersonal and communication abilities",
    criteria: [
      {
        id: "2-1",
        name: "Written Communication",
        description: "Clear and effective written communication",
        weight: 20
      },
      {
        id: "2-2",
        name: "Verbal Communication",
        description: "Clear and effective verbal communication",
        weight: 25
      }
    ]
  }
];

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingCriteria, setIsAddingCriteria] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: ""
  });

  const [newCriteria, setNewCriteria] = useState({
    name: "",
    description: "",
    weight: 20
  });

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      const category: Category = {
        id: Date.now().toString(),
        name: newCategory.name,
        description: newCategory.description,
        criteria: []
      };
      setCategories([...categories, category]);
      setNewCategory({ name: "", description: "" });
      setIsAddingCategory(false);
    }
  };

  const handleAddCriteria = () => {
    if (selectedCategory && newCriteria.name.trim()) {
      const criteria: Criteria = {
        id: Date.now().toString(),
        name: newCriteria.name,
        description: newCriteria.description,
        weight: newCriteria.weight
      };
      
      const updatedCategories = categories.map(cat =>
        cat.id === selectedCategory.id
          ? { ...cat, criteria: [...cat.criteria, criteria] }
          : cat
      );
      
      setCategories(updatedCategories);
      setSelectedCategory({
        ...selectedCategory,
        criteria: [...selectedCategory.criteria, criteria]
      });
      setNewCriteria({ name: "", description: "", weight: 20 });
      setIsAddingCriteria(false);
    }
  };

  const getTotalWeight = (criteria: Criteria[]) => {
    return criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Categories</h1>
          <p className="text-muted-foreground">
            Manage categories and criteria for performance reviews
          </p>
        </div>
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new category for performance evaluation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="e.g., Technical Skills"
                />
              </div>
              <div>
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  placeholder="Brief description of this category"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCategory} className="flex-1">
                  Create Category
                </Button>
                <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className={`shadow-card hover:shadow-elegant transition-shadow duration-300 cursor-pointer ${
              selectedCategory?.id === category.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {category.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Criteria</span>
                  <Badge variant="outline">
                    {category.criteria.length} items
                  </Badge>
                </div>
                
                {category.criteria.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Weight className="h-4 w-4" />
                    <span>Total Weight: {getTotalWeight(category.criteria)}%</span>
                  </div>
                )}

                <div className="space-y-2">
                  {category.criteria.slice(0, 3).map((criteria) => (
                    <div key={criteria.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{criteria.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {criteria.weight}%
                      </Badge>
                    </div>
                  ))}
                  {category.criteria.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{category.criteria.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Category Details */}
      {selectedCategory && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedCategory.name} - Criteria Details
              </CardTitle>
              <Dialog open={isAddingCriteria} onOpenChange={setIsAddingCriteria}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criteria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Criteria</DialogTitle>
                    <DialogDescription>
                      Add a new criteria to {selectedCategory.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="criteria-name">Criteria Name</Label>
                      <Input
                        id="criteria-name"
                        value={newCriteria.name}
                        onChange={(e) => setNewCriteria({...newCriteria, name: e.target.value})}
                        placeholder="e.g., Code Quality"
                      />
                    </div>
                    <div>
                      <Label htmlFor="criteria-description">Description</Label>
                      <Textarea
                        id="criteria-description"
                        value={newCriteria.description}
                        onChange={(e) => setNewCriteria({...newCriteria, description: e.target.value})}
                        placeholder="Description of this criteria"
                      />
                    </div>
                    <div>
                      <Label htmlFor="criteria-weight">Weight (%)</Label>
                      <Input
                        id="criteria-weight"
                        type="number"
                        min="1"
                        max="100"
                        value={newCriteria.weight}
                        onChange={(e) => setNewCriteria({...newCriteria, weight: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddCriteria} className="flex-1">
                        Add Criteria
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingCriteria(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedCategory.criteria.map((criteria) => (
                <Card key={criteria.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{criteria.name}</h4>
                        <Badge variant="outline">{criteria.weight}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {criteria.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {selectedCategory.criteria.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No criteria added yet</p>
                  <p className="text-sm">Add criteria to start building this category</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}