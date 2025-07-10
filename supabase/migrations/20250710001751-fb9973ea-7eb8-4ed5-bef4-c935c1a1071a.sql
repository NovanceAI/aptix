-- Create evaluation criteria table
CREATE TABLE public.evaluation_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  evaluatee_id UUID NOT NULL, -- Person being evaluated
  evaluator_id UUID NOT NULL, -- Person doing the evaluation
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluation responses table (links evaluations to criteria with scores)
CREATE TABLE public.evaluation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE NOT NULL,
  criteria_id UUID REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5), -- 1-5 rating scale
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, criteria_id)
);

-- Enable Row Level Security
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_criteria
CREATE POLICY "Super admins can manage all evaluation criteria" 
ON public.evaluation_criteria 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins can manage their client's criteria" 
ON public.evaluation_criteria 
FOR ALL 
USING (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin');

CREATE POLICY "Users can view their client's criteria" 
ON public.evaluation_criteria 
FOR SELECT 
USING (client_id = get_user_client_id(auth.uid()));

-- RLS Policies for evaluations
CREATE POLICY "Super admins can manage all evaluations" 
ON public.evaluations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Client admins can manage their client's evaluations" 
ON public.evaluations 
FOR ALL 
USING (client_id = get_user_client_id(auth.uid()) AND get_user_role(auth.uid()) = 'client_admin');

CREATE POLICY "Users can view evaluations they're involved in" 
ON public.evaluations 
FOR SELECT 
USING (
  client_id = get_user_client_id(auth.uid()) AND 
  (evaluatee_id = auth.uid() OR evaluator_id = auth.uid())
);

CREATE POLICY "Users can update evaluations they're evaluating" 
ON public.evaluations 
FOR UPDATE 
USING (
  client_id = get_user_client_id(auth.uid()) AND 
  evaluator_id = auth.uid()
);

-- RLS Policies for evaluation_responses
CREATE POLICY "Super admins can manage all evaluation responses" 
ON public.evaluation_responses 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can manage responses for evaluations they're evaluating" 
ON public.evaluation_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.evaluations e 
    WHERE e.id = evaluation_id 
    AND e.client_id = get_user_client_id(auth.uid())
    AND e.evaluator_id = auth.uid()
  )
);

CREATE POLICY "Users can view responses for evaluations they're involved in" 
ON public.evaluation_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.evaluations e 
    WHERE e.id = evaluation_id 
    AND e.client_id = get_user_client_id(auth.uid())
    AND (e.evaluatee_id = auth.uid() OR e.evaluator_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX idx_evaluations_client_id ON public.evaluations(client_id);
CREATE INDEX idx_evaluations_evaluatee_id ON public.evaluations(evaluatee_id);
CREATE INDEX idx_evaluations_evaluator_id ON public.evaluations(evaluator_id);
CREATE INDEX idx_evaluations_status ON public.evaluations(status);
CREATE INDEX idx_evaluation_criteria_client_id ON public.evaluation_criteria(client_id);
CREATE INDEX idx_evaluation_responses_evaluation_id ON public.evaluation_responses(evaluation_id);
CREATE INDEX idx_evaluation_responses_criteria_id ON public.evaluation_responses(criteria_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_evaluation_criteria_updated_at
BEFORE UPDATE ON public.evaluation_criteria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_responses_updated_at
BEFORE UPDATE ON public.evaluation_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();