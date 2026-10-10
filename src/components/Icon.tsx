import {
  BookOpen,
  TrainFront,
  Utensils,
  School,
  GraduationCap,
  Bath,
  Coffee,
  Sun,
  Ellipsis,
  BriefcaseBusiness,
  Music,
  Footprints,
} from "lucide-react";
import type { Category, CategoryIcon } from "../lib/types";
const icons = {
  book: BookOpen,
  train: TrainFront,
  utensils: Utensils,
  school: School,
  graduation: GraduationCap,
  bath: Bath,
  coffee: Coffee,
  sun: Sun,
  dots: Ellipsis,
  work: BriefcaseBusiness,
  music: Music,
  walk: Footprints,
};
export function ActivityIcon({
  name,
  size = 22,
}: {
  name: CategoryIcon;
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
export function CategoryBadge({
  category,
  small = false,
}: {
  category: Category;
  small?: boolean;
}) {
  return (
    <span
      className={`category-icon color-${category.color} ${small ? "small" : ""}`}
    >
      <ActivityIcon name={category.icon} size={small ? 19 : 25} />
    </span>
  );
}
