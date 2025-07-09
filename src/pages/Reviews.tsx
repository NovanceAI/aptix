import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { 
  Play, 
  Clock, 
  CheckCircle,
  FileText,
  User,
  Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ReviewCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  rating?: number;
  comment?: string;
}

interface Review {
  id: string;
  title: string;
  type: "self" | "supervisor" | "colleague";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  reviewerName: string;
  criteria: ReviewCriteria[];
  overallRating?: number;
}

const mockReviews: Review[] = [
  {
    id: "1",
    title: "Q4 2024 Self Assessment",
    type: "self",
    status: "pending",
    dueDate: "2024-12-31",
    reviewerName: "Self Assessment",
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
        name: "Team Collaboration",
        description: "Working effectively with team members",
        weight: 20
      }
    ]
  },
  {
    id: "2",
    title: "Leadership Review",
    type: "supervisor",
    status: "completed",
    dueDate: "2024-12-15",
    reviewerName: "Sarah Johnson",
    criteria: [
      {
        id: "2-1",
        name: "Technical Leadership",
        description: "Guiding technical decisions and mentoring",
        weight: 40,
        rating: 4,
        comment: "Shows strong technical leadership and mentors junior developers effectively."
      },
      {
        id: "2-2",
        name: "Communication",
        description: "Clear and effective communication",
        weight: 30,
        rating: 5,
        comment: "Excellent communication skills, both written and verbal."
      }
    ],
    overallRating: 4.2
  }
];

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-success" />;
      case "in-progress": return <Clock className="h-4 w-4 text-warning" />;
      default: return <Play className="h-4 w-4 text-muted-foreground" />;
    }
  };

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

  const handleStartReview = (review: Review) => {
    setSelectedReview({
      ...review,
      status: "in-progress"
    });
    setIsReviewing(true);
  };

  const handleRatingChange = (criteriaId: string, rating: number) => {
    if (selectedReview) {
      const updatedCriteria = selectedReview.criteria.map(criterion =>
        criterion.id === criteriaId
          ? { ...criterion, rating }
          : criterion
      );
      setSelectedReview({
        ...selectedReview,
        criteria: updatedCriteria
      });
    }
  };

  const handleCommentChange = (criteriaId: string, comment: string) => {
    if (selectedReview) {
      const updatedCriteria = selectedReview.criteria.map(criterion =>
        criterion.id === criteriaId
          ? { ...criterion, comment }
          : criterion
      );
      setSelectedReview({
        ...selectedReview,
        criteria: updatedCriteria
      });
    }
  };

  const handleSaveReview = () => {
    if (selectedReview) {
      const totalWeight = selectedReview.criteria.reduce((sum, c) => sum + c.weight, 0);
      const weightedRating = selectedReview.criteria.reduce((sum, c) => 
        sum + (c.rating || 0) * (c.weight / totalWeight), 0
      );

      const updatedReview = {
        ...selectedReview,
        status: "completed" as const,
        overallRating: Math.round(weightedRating * 10) / 10
      };

      setReviews(reviews.map(r => r.id === selectedReview.id ? updatedReview : r));
      setIsReviewing(false);
      setSelectedReview(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Reviews</h1>
          <p className="text-muted-foreground">
            Complete your performance reviews and view feedback
          </p>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <Card key={review.id} className="shadow-card hover:shadow-elegant transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {review.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(review.type)}>
                      {review.type}
                    </Badge>
                    <Badge className={getStatusColor(review.status)}>
                      {getStatusIcon(review.status)}
                      <span className="ml-1">{review.status.replace("-", " ")}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{review.reviewerName}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Due: {new Date(review.dueDate).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                <span>{review.criteria.length} criteria</span>
              </div>

              {review.overallRating && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Overall Rating:</span>
                  <StarRating rating={review.overallRating} readonly size="sm" />
                  <span className="text-sm text-muted-foreground">
                    ({review.overallRating}/5)
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {review.status === "pending" && (
                  <Button 
                    onClick={() => handleStartReview(review)}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Review
                  </Button>
                )}
                {review.status === "in-progress" && (
                  <Button 
                    onClick={() => {
                      setSelectedReview(review);
                      setIsReviewing(true);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Continue Review
                  </Button>
                )}
                {review.status === "completed" && (
                  <Button 
                    onClick={() => {
                      setSelectedReview(review);
                      setIsReviewing(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    View Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewing || (selectedReview !== null && !isReviewing)} onOpenChange={(open) => {
        if (!open) {
          setSelectedReview(null);
          setIsReviewing(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReview?.title}
            </DialogTitle>
            <DialogDescription>
              {isReviewing ? "Complete your review by rating each criteria and providing comments." : "Review details and feedback."}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Badge className={getTypeColor(selectedReview.type)}>
                  {selectedReview.type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Reviewer: {selectedReview.reviewerName}
                </span>
              </div>

              <div className="space-y-4">
                {selectedReview.criteria.map((criteria) => (
                  <Card key={criteria.id} className="p-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{criteria.name}</h4>
                          <Badge variant="outline">{criteria.weight}% weight</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {criteria.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Label className="text-sm font-medium">Rating:</Label>
                          <StarRating
                            rating={criteria.rating || 0}
                            onRatingChange={isReviewing ? (rating) => handleRatingChange(criteria.id, rating) : undefined}
                            readonly={!isReviewing}
                          />
                          {criteria.rating && (
                            <span className="text-sm text-muted-foreground">
                              ({criteria.rating}/5)
                            </span>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`comment-${criteria.id}`} className="text-sm font-medium">
                            Comments:
                          </Label>
                          <Textarea
                            id={`comment-${criteria.id}`}
                            value={criteria.comment || ""}
                            onChange={isReviewing ? (e) => handleCommentChange(criteria.id, e.target.value) : undefined}
                            placeholder={isReviewing ? "Add your comments..." : "No comments provided"}
                            className="mt-1"
                            readOnly={!isReviewing}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {isReviewing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveReview} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Review
                  </Button>
                  <Button variant="outline" onClick={() => setIsReviewing(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}