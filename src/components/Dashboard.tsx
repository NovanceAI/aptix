import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./ReviewCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  Users, 
  Clock, 
  Award,
  Plus,
  TrendingUp
} from "lucide-react";

interface DashboardStats {
  totalReviews: number;
  pendingReviews: number;
  teamMembers: number;
  avgRating: number;
}

interface RecentReview {
  id: string;
  title: string;
  reviewType: "self" | "supervisor" | "colleague";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  completedDate?: string;
  rating?: number;
  reviewerName: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalReviews: 0,
    pendingReviews: 0,
    teamMembers: 0,
    avgRating: 0
  });
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get user's client ID first
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.client_id) {
        setLoading(false);
        return;
      }

      // Get total evaluations for user's client
      const { count: totalReviews } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profile.client_id);

      // Get pending evaluations
      const { count: pendingReviews } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profile.client_id)
        .in('status', ['pending', 'draft']);

      // Get team members count
      const { count: teamMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profile.client_id);

      // Get completed evaluations with responses to calculate average rating
      const { data: completedEvaluations } = await supabase
        .from('evaluations')
        .select(`
          id,
          evaluation_responses(score)
        `)
        .eq('client_id', profile.client_id)
        .eq('status', 'completed');

      // Calculate average rating
      let totalScores = 0;
      let scoreCount = 0;
      
      completedEvaluations?.forEach(evaluation => {
        evaluation.evaluation_responses?.forEach((response: any) => {
          if (response.score) {
            totalScores += response.score;
            scoreCount++;
          }
        });
      });

      const avgRating = scoreCount > 0 ? totalScores / scoreCount : 0;

      // Get recent evaluations for current user
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select(`
          id,
          title,
          status,
          due_date,
          completed_at,
          evaluator_id,
          evaluatee_id,
          profiles!evaluations_evaluator_id_fkey(first_name, last_name)
        `)
        .eq('client_id', profile.client_id)
        .or(`evaluator_id.eq.${user?.id},evaluatee_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(6);

      // Transform evaluations data
      const formattedReviews: RecentReview[] = evaluationsData?.map(evaluation => {
        const evaluatorProfile = evaluation.profiles as any;
        const reviewerName = evaluatorProfile ? 
          `${evaluatorProfile.first_name || ''} ${evaluatorProfile.last_name || ''}`.trim() : 
          'Unknown';

        return {
          id: evaluation.id,
          title: evaluation.title,
          reviewType: evaluation.evaluator_id === user?.id ? "self" : "supervisor" as const,
          status: evaluation.status === 'completed' ? 'completed' : 
                  evaluation.status === 'in_progress' ? 'in-progress' : 'pending' as const,
          dueDate: evaluation.due_date ? new Date(evaluation.due_date).toLocaleDateString() : 'No due date',
          completedDate: evaluation.completed_at ? new Date(evaluation.completed_at).toLocaleDateString() : undefined,
          reviewerName: reviewerName || 'Self Assessment'
        };
      }) || [];

      setStats({
        totalReviews: totalReviews || 0,
        pendingReviews: pendingReviews || 0,
        teamMembers: teamMembers || 0,
        avgRating: Math.round(avgRating * 10) / 10
      });

      setRecentReviews(formattedReviews);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReports = () => {
    // For now, show a toast that this feature is coming soon
    toast({
      title: "Export Reports",
      description: "Report export functionality coming soon!",
    });
  };

  const statsData = [
    {
      title: "Total Reviews",
      value: stats.totalReviews.toString(),
      change: "+12%",
      icon: BarChart3,
      trend: "up" as const
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews.toString(),
      change: "-3",
      icon: Clock,
      trend: "down" as const
    },
    {
      title: "Team Members",
      value: stats.teamMembers.toString(),
      change: "+2",
      icon: Users,
      trend: "up" as const
    },
    {
      title: "Avg Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toString() : "N/A",
      change: "+0.3",
      icon: Award,
      trend: "up" as const
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Track and manage 360° performance reviews
          </p>
        </div>
        <Button className="bg-gradient-primary shadow-elegant">
          <Plus className="h-4 w-4 mr-2" />
          New Review
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Card key={stat.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  stat.trend === 'up' ? 'text-success' : 'text-destructive'
                }`} />
                <span className={
                  stat.trend === 'up' ? 'text-success' : 'text-destructive'
                }>
                  {stat.change}
                </span>
                <span className="ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reviews */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Reviews</h2>
          <Button variant="outline">View All</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReviews.length > 0 ? (
            recentReviews.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No reviews found. Start by creating your first evaluation!
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/categories')}
            >
              <Users className="h-6 w-6 mb-2" />
              <span>Manage Categories</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/results')}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>View Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={handleExportReports}
            >
              <Award className="h-6 w-6 mb-2" />
              <span>Export Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};