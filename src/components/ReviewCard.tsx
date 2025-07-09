import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { User, Calendar } from "lucide-react";

interface ReviewCardProps {
  title: string;
  reviewType: "self" | "supervisor" | "colleague";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  completedDate?: string;
  rating?: number;
  reviewerName?: string;
}

export const ReviewCard = ({
  title,
  reviewType,
  status,
  dueDate,
  completedDate,
  rating,
  reviewerName
}: ReviewCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-success-foreground";
      case "in-progress": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "self": return "bg-primary text-primary-foreground";
      case "supervisor": return "bg-secondary text-secondary-foreground";
      default: return "bg-accent text-accent-foreground";
    }
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge className={getStatusColor(status)}>
            {status.replace("-", " ")}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={getTypeColor(reviewType)}>
            {reviewType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewerName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{reviewerName}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {status === "completed" && completedDate 
              ? `Completed: ${completedDate}`
              : `Due: ${dueDate}`
            }
          </span>
        </div>

        {rating && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Overall Rating:</span>
            <StarRating rating={rating} readonly size="sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};