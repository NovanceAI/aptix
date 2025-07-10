import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Circle
} from "lucide-react";

interface EvaluationPeriod {
  id: string;
  name: string;
  description: string | null;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  client_id: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

interface PeriodForm {
  name: string;
  description: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  start_date: Date;
  end_date: Date;
  status: 'draft' | 'active' | 'completed';
}

export default function EvaluationPeriods() {
  const { user, profile } = useAuth();
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null);
  const { toast } = useToast();

  const form = useForm<PeriodForm>({
    defaultValues: {
      name: '',
      description: '',
      frequency: 'quarterly',
      status: 'draft'
    }
  });

  // Only show this to client admins
  if (profile?.role !== 'client_admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground">Access Denied</h1>
        <p className="text-muted-foreground">Only client administrators can manage evaluation periods.</p>
      </div>
    );
  }

  useEffect(() => {
    if (user && profile) {
      fetchPeriods();
    }
  }, [user, profile]);

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_periods')
        .select('*')
        .eq('client_id', profile!.client_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeriods((data || []) as EvaluationPeriod[]);
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch evaluation periods",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (data: PeriodForm) => {
    try {
      const { error } = await supabase
        .from('evaluation_periods')
        .insert({
          name: data.name,
          description: data.description || null,
          frequency: data.frequency,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: format(data.end_date, 'yyyy-MM-dd'),
          status: data.status,
          client_id: profile!.client_id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Evaluation period created successfully",
      });
      
      setIsDialogOpen(false);
      form.reset();
      fetchPeriods();
    } catch (error: any) {
      console.error('Error creating period:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create evaluation period",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (data: PeriodForm) => {
    if (!editingPeriod) return;

    try {
      const { error } = await supabase
        .from('evaluation_periods')
        .update({
          name: data.name,
          description: data.description || null,
          frequency: data.frequency,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: format(data.end_date, 'yyyy-MM-dd'),
          status: data.status
        })
        .eq('id', editingPeriod.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Evaluation period updated successfully",
      });
      
      setIsDialogOpen(false);
      setEditingPeriod(null);
      form.reset();
      fetchPeriods();
    } catch (error: any) {
      console.error('Error updating period:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update evaluation period",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('evaluation_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Evaluation period deleted successfully",
      });
      
      fetchPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete evaluation period",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (period: EvaluationPeriod) => {
    setEditingPeriod(period);
    form.setValue('name', period.name);
    form.setValue('description', period.description || '');
    form.setValue('frequency', period.frequency);
    form.setValue('start_date', new Date(period.start_date));
    form.setValue('end_date', new Date(period.end_date));
    form.setValue('status', period.status);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingPeriod(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Evaluation Periods
          </h2>
          <p className="text-muted-foreground">
            Manage evaluation periods for your organization
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Period
        </Button>
      </div>

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Periods</CardTitle>
          <CardDescription>
            Create and manage evaluation periods for monthly, quarterly, or yearly reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{period.name}</div>
                        {period.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {period.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {period.frequency.charAt(0).toUpperCase() + period.frequency.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.start_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.end_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(period.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(period.status)}
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(period)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(period.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No evaluation periods found</p>
              <p className="text-sm">Create your first evaluation period to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Edit Evaluation Period' : 'Create New Evaluation Period'}
            </DialogTitle>
            <DialogDescription>
              {editingPeriod 
                ? 'Update the evaluation period details' 
                : 'Create a new evaluation period for your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(editingPeriod ? handleUpdate : handleCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Period Name</Label>
                <Input
                  id="name"
                  {...form.register('name', { required: 'Period name is required' })}
                  placeholder="e.g., Q1 2024 Performance Review"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select 
                  value={form.watch('frequency')} 
                  onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') => 
                    form.setValue('frequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe the evaluation period goals and objectives..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('start_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('start_date') ? (
                        format(form.watch('start_date'), "PPP")
                      ) : (
                        <span>Pick start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('start_date')}
                      onSelect={(date) => date && form.setValue('start_date', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('end_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('end_date') ? (
                        format(form.watch('end_date'), "PPP")
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('end_date')}
                      onSelect={(date) => date && form.setValue('end_date', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={form.watch('status')} 
                onValueChange={(value: 'draft' | 'active' | 'completed') => 
                  form.setValue('status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPeriod ? 'Update' : 'Create'} Period
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}