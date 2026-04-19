export type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
};

export type PlanDayExerciseRow = {
  id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: Exercise | null;
};

export type PlanDay = {
  id: string;
  day_number: number;
  name: string | null;
  notes: string | null;
  plan_day_exercises: PlanDayExerciseRow[];
};

export type PlanWeek = {
  id: string;
  week_number: number;
  name: string | null;
  plan_days: PlanDay[];
};

export type PlanDetail = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  source_url: string | null;
  plan_weeks: PlanWeek[];
};
