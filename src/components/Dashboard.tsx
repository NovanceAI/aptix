import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./ReviewCard";
import { 
  BarChart3, 
  Users, 
  Clock, 
  Award,
  Plus,
  TrendingUp
} from "lucide-react";

const stats = [
  {
    title: "Total Reviews",
    value: "24",
    change: "+12%",
    icon: BarChart3,
    trend: "up"
  },
  {
    title: "Pending Reviews",
    value: "6",
    change: "-3",
    icon: Clock,
    trend: "down"
  },
  {
    title: "Team Members",
    value: "18",
    change: "+2",
    icon: Users,
    trend: "up"
  },
  {
    title: "Avg Rating",
    value: "4.2",
    change: "+0.3",
    icon: Award,
    trend: "up"
  }
];

const recentReviews = [
  {
    title: "Q4 2024 Performance Review",
    reviewType: "self" as const,
    status: "pending" as const,
    dueDate: "Dec 31, 2024",
    reviewerName: "Self Assessment"
  },
  {
    title: "Leadership Skills Assessment",
    reviewType: "supervisor" as const,
    status: "in-progress" as const,
    dueDate: "Dec 28, 2024",
    reviewerName: "Sarah Johnson"
  },
  {
    title: "Team Collaboration Review",
    reviewType: "colleague" as const,
    status: "completed" as const,
    dueDate: "Dec 15, 2024",
    completedDate: "Dec 14, 2024",
    rating: 4,
    reviewerName: "Mike Chen"
  }
];

export const Dashboard = () => {
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
        {stats.map((stat) => (
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
          {recentReviews.map((review, index) => (
            <ReviewCard key={index} {...review} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span>Manage Categories</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Award className="h-6 w-6 mb-2" />
              <span>Export Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};