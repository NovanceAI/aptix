-- Create evaluation_periods table
CREATE TABLE public.evaluation_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  client_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.evaluation_periods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for evaluation_periods
CREATE POLICY "Client admins can manage periods in their client" 
ON public.evaluation_periods 
FOR ALL 
USING (
  (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin') OR
  get_user_role(auth.uid()) = 'super_admin'
);

CREATE POLICY "Area admins can view periods in their client" 
ON public.evaluation_periods 
FOR SELECT 
USING (
  client_id = get_user_client_id(auth.uid())
);

CREATE POLICY "Users can view periods in their client" 
ON public.evaluation_periods 
FOR SELECT 
USING (
  client_id = get_user_client_id(auth.uid())
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_evaluation_periods_updated_at
BEFORE UPDATE ON public.evaluation_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_evaluation_periods_client_id ON public.evaluation_periods(client_id);
CREATE INDEX idx_evaluation_periods_status ON public.evaluation_periods(status);
CREATE INDEX idx_evaluation_periods_dates ON public.evaluation_periods(start_date, end_date);