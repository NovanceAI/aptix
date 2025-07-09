import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = "md" 
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={cn(
            "transition-colors duration-200",
            !readonly && "hover:scale-110",
            readonly && "cursor-default"
          )}
          onClick={() => !readonly && onRatingChange?.(star)}
          disabled={readonly}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors duration-200",
              star <= rating 
                ? "fill-primary text-primary" 
                : "fill-muted text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
};