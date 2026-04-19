export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "full_body"
  | "other";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "other";

export type CanonicalExercise = {
  name: string;
  primary_muscle: MuscleGroup;
  equipment: Equipment;
  description: string;
  aliases: string[];
};

export const CANONICAL_LIBRARY: CanonicalExercise[] = [
  // ===== chest =====
  {
    name: "Bench Press",
    primary_muscle: "chest",
    equipment: "barbell",
    description:
      "flat barbell press. bar touches mid-chest, press straight up to lockout. drives chest, triceps, and front delts.",
    aliases: ["bench", "bb bench", "bb bench press", "barbell bench press"],
  },
  {
    name: "Incline Bench Press",
    primary_muscle: "chest",
    equipment: "barbell",
    description:
      "bench at 30-45 degrees. emphasizes upper chest and front delts more than flat bench.",
    aliases: [
      "incline bench",
      "bb incline bench",
      "bb incline press",
      "incline bb bench",
      "incline bb bench press",
      "barbell incline press",
    ],
  },
  {
    name: "Decline Bench Press",
    primary_muscle: "chest",
    equipment: "barbell",
    description:
      "bench at a downward angle. hits lower pecs hard; lets you press slightly heavier than flat.",
    aliases: ["decline bench press"],
  },
  {
    name: "Dumbbell Bench Press",
    primary_muscle: "chest",
    equipment: "dumbbell",
    description:
      "flat bench with dumbbells. deeper stretch at the bottom than a barbell, independent arm paths.",
    aliases: ["db bench", "db bench press"],
  },
  {
    name: "Incline Dumbbell Press",
    primary_muscle: "chest",
    equipment: "dumbbell",
    description:
      "incline bench with dumbbells. upper chest focus with more range of motion than barbell incline.",
    aliases: [
      "incline db bench",
      "incline db bench press",
      "incline db press",
      "db incline bench",
      "db incline press",
    ],
  },
  {
    name: "Close-Grip Dumbbell Bench Press",
    primary_muscle: "chest",
    equipment: "dumbbell",
    description:
      "dumbbells held close with elbows tucked. shifts load toward inner chest and triceps.",
    aliases: ["close grip db bench press", "close-grip db bench"],
  },
  {
    name: "Dumbbell Squeeze Press",
    primary_muscle: "chest",
    equipment: "dumbbell",
    description:
      "dumbbells pressed together throughout the rep. inner chest emphasis, constant tension.",
    aliases: ["db squeeze press"],
  },
  {
    name: "Dumbbell Fly",
    primary_muscle: "chest",
    equipment: "dumbbell",
    description:
      "flat bench fly with dumbbells, slight elbow bend. chest stretch at the bottom, isolation move.",
    aliases: ["db flies", "db bench fly", "chest fly", "flys", "bench fly"],
  },
  {
    name: "Cable Fly",
    primary_muscle: "chest",
    equipment: "cable",
    description:
      "standing cable fly. constant tension through the full arc. vary cable height to target upper, mid, or lower chest.",
    aliases: [
      "cable crossover",
      "cable crossovers",
      "cable cross-over",
      "high cable crossover",
      "low cable crossover",
      "reverse cable fly",
      "cable fly",
      "cable flys",
      "standing reverse cable crossover",
    ],
  },
  {
    name: "Push-up",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "body-weight horizontal press. hands under shoulders, full body rigid, lower to an inch off the floor.",
    aliases: ["push ups", "pushups", "push-ups"],
  },
  {
    name: "Weighted Push-up",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "push-up with plate on back or weighted vest. progressive overload when regular push-ups become easy.",
    aliases: ["weighted pushups", "weighted push-ups"],
  },
  {
    name: "Cluster Push-up",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "rest-pause style push-up set. work to near-failure, short 10-15s rests, continue until target reps.",
    aliases: ["cluster push-ups"],
  },
  {
    name: "Diamond Push-up",
    primary_muscle: "triceps",
    equipment: "bodyweight",
    description:
      "push-up with hands forming a diamond under the chest. tricep-dominant push-up variation.",
    aliases: ["diamond pushup", "diaomond pushup"],
  },
  {
    name: "Pike Push-up",
    primary_muscle: "shoulders",
    equipment: "bodyweight",
    description:
      "hips piked up, press head toward the floor. shoulder-dominant push-up, closer to an overhead press pattern.",
    aliases: ["pike pushups"],
  },
  {
    name: "Dip",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "parallel-bar dip. lean forward for chest bias, upright for triceps. deep stretch through the pec-delt tie-in.",
    aliases: ["dips"],
  },
  {
    name: "Weighted Dip",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "dip with added load via belt. great compound for upper-body pushing strength.",
    aliases: ["weighted dips"],
  },
  {
    name: "Cluster Dip",
    primary_muscle: "chest",
    equipment: "bodyweight",
    description:
      "rest-pause style dip set. build to max reps via short intra-set rests.",
    aliases: ["cluster dips"],
  },
  {
    name: "Bench Dip",
    primary_muscle: "triceps",
    equipment: "bodyweight",
    description:
      "hands on a bench behind you, feet elevated or on floor. tricep-dominant; easier than parallel-bar dips.",
    aliases: ["bench dips"],
  },
  {
    name: "Svend Press",
    primary_muscle: "chest",
    equipment: "other",
    description:
      "plate pressed between the palms and pushed straight out from the chest. inner chest isolation with constant squeeze.",
    aliases: ["svend press"],
  },

  // ===== back =====
  {
    name: "Deadlift",
    primary_muscle: "hamstrings",
    equipment: "barbell",
    description:
      "pick a loaded bar off the floor. posterior chain primary — hamstrings, glutes, erectors. hips and shoulders rise together.",
    aliases: ["bb deadlift", "conventional dl", "straight-leg dl"],
  },
  {
    name: "Sumo Deadlift",
    primary_muscle: "glutes",
    equipment: "barbell",
    description:
      "wide stance, hands inside the knees. shorter range than conventional, more adductor and quad.",
    aliases: ["sumo deadlift"],
  },
  {
    name: "Romanian Deadlift",
    primary_muscle: "hamstrings",
    equipment: "barbell",
    description:
      "hinge with a slight knee bend, bar travels close to the thighs. hamstring and glute stretch, no touch-and-go on the floor.",
    aliases: ["romanian deadlift"],
  },
  {
    name: "Dumbbell RDL",
    primary_muscle: "hamstrings",
    equipment: "dumbbell",
    description:
      "romanian deadlift with dumbbells. softer on the lower back, bigger range of motion at the bottom.",
    aliases: ["db rdl", "db romanian deadlift", "dumbell rdl", "db dl"],
  },
  {
    name: "Dumbbell Deadlift",
    primary_muscle: "hamstrings",
    equipment: "dumbbell",
    description:
      "deadlift with dumbbells. beginner-friendly; also useful for high-rep accessory work.",
    aliases: ["db deadlift"],
  },
  {
    name: "Single-Leg Romanian Deadlift",
    primary_muscle: "hamstrings",
    equipment: "dumbbell",
    description:
      "one-legged RDL. hamstring and glute work plus balance and anti-rotation through the torso.",
    aliases: [
      "single leg rdl",
      "db single leg rdl",
      "db single leg deadlift",
      "romanian deadlift - single leg",
      "romanian dl - single leg",
      "single leg romanian deadlift",
    ],
  },
  {
    name: "Good Morning",
    primary_muscle: "hamstrings",
    equipment: "barbell",
    description:
      "bar on back, hinge forward with a slight knee bend. hamstring and lower back accessory.",
    aliases: ["good morning", "good mornings", "standing good morning"],
  },
  {
    name: "Seated Good Morning",
    primary_muscle: "back",
    equipment: "barbell",
    description:
      "good morning performed seated on a bench. isolates the spinal erectors, takes hamstrings out of the lift.",
    aliases: ["seated good mornings"],
  },
  {
    name: "Single-Leg Good Morning",
    primary_muscle: "hamstrings",
    equipment: "barbell",
    description:
      "good morning on one leg. unilateral hamstring and balance work with lighter load.",
    aliases: ["bb single leg good morning"],
  },
  {
    name: "Barbell Row",
    primary_muscle: "back",
    equipment: "barbell",
    description:
      "bent-over bar row. torso near-parallel, bar to belly-button. mid-back and lats, with lower-back iso holding position.",
    aliases: [
      "barbell rows",
      "bent over bb row",
      "bent over row",
      "bent-over row",
      "upright bb row",
    ],
  },
  {
    name: "Pendlay Row",
    primary_muscle: "back",
    equipment: "barbell",
    description:
      "dead-stop row. reset on the floor between reps. explosive pulling strength.",
    aliases: ["pendlay row"],
  },
  {
    name: "Dumbbell Row",
    primary_muscle: "back",
    equipment: "dumbbell",
    description:
      "single-arm bench-supported row. unilateral back work, lets you row heavy without lower-back fatigue.",
    aliases: [
      "single arm db row",
      "single arm row",
      "row - single arm",
      "single arm rows",
    ],
  },
  {
    name: "Seated Cable Row",
    primary_muscle: "back",
    equipment: "cable",
    description:
      "seated cable row with a handle. mid-back focus. vary attachments to change grip width and lat recruitment.",
    aliases: [
      "seated cable rows",
      "seated rows",
      "seated row",
      "cable row",
      "narrow grip cable rows",
      "wide grip cable rows",
      "seated cable row (narrow)",
      "seated cable row (wide)",
      "wide-grip seated row",
      "wide grip rows",
    ],
  },
  {
    name: "Single-Arm Cable Row",
    primary_muscle: "back",
    equipment: "cable",
    description:
      "one-handed cable row. lets the arm travel farther back than a two-handed row, bigger lat stretch.",
    aliases: [
      "single arm cable row",
      "single-arm cable row",
      "sinlge arm cable row",
    ],
  },
  {
    name: "Inverted Row",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "horizontal bodyweight row under a bar. scale by adjusting body angle. upper-back builder.",
    aliases: [
      "inverted rows",
      "inverted row",
      "inverted bodyweight row",
    ],
  },
  {
    name: "Landmine Row",
    primary_muscle: "back",
    equipment: "barbell",
    description:
      "bent-over row with one end of the barbell anchored. t-bar style; heavy loads with lower-back support.",
    aliases: ["landmine rows", "landmine t-bar row"],
  },
  {
    name: "Pull-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "overhand grip, pull chin over the bar. big lat and upper-back pulling strength.",
    aliases: ["pull ups", "pullups", "pull-up"],
  },
  {
    name: "Weighted Pull-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "pull-up with added weight via belt or vest. progressive overload once bodyweight pulls are easy for sets of 8+.",
    aliases: [],
  },
  {
    name: "Chin-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "underhand grip pull-up. more biceps involvement than a pull-up; usually easier.",
    aliases: ["chin-ups", "chin ups", "chin-up"],
  },
  {
    name: "Weighted Chin-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "chin-up with added load. strong lat-and-biceps builder, great for intermediate lifters.",
    aliases: ["weighted chin-ups", "weighted chin-ups (eccentrics)"],
  },
  {
    name: "Neutral-Grip Pull-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "palms facing each other. splits the difference between pull-up and chin-up. elbow-friendly.",
    aliases: ["neutral grip pull-ups"],
  },
  {
    name: "Wide-Grip Pull-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "pull-up with hands wider than shoulders. more upper-lat and teres major, less biceps.",
    aliases: ["wide grip pull-ups", "wide-grip pullups", "wide grip pull-ups"],
  },
  {
    name: "Cluster Chin-up",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "rest-pause chin-up set. build total reps by taking 10-15s breaks within a single cluster.",
    aliases: ["cluster chin-ups"],
  },
  {
    name: "Lat Pulldown",
    primary_muscle: "back",
    equipment: "cable",
    description:
      "seated cable pulldown. pull the bar to the upper chest, drive elbows down-and-back. lat builder.",
    aliases: [
      "lat pull down",
      "lat pull-downs",
      "lat pulldown",
      "wide grip lat pulldown",
      "wide grip lat pull down",
      "narrow grip lat pulldown",
      "reverse grip lat pulldown",
      "reverse grip lat pull-downs",
      "behind neck lat pulldown",
    ],
  },
  {
    name: "V-Bar Lat Pulldown",
    primary_muscle: "back",
    equipment: "cable",
    description:
      "lat pulldown with a narrow v-handle. strong lat contraction with a neutral grip.",
    aliases: ["v bar pulldown", "v-bar pulldown", "v-bar lat pull down"],
  },
  {
    name: "Cable Pullover",
    primary_muscle: "back",
    equipment: "cable",
    description:
      "straight-arm pulldown. isolate the lats without biceps doing any work.",
    aliases: [
      "cable pullover",
      "straight arm pulldown",
      "kneeling straight arm pull down",
      "kneeling straight arm pull-down",
    ],
  },
  {
    name: "Dumbbell Pullover",
    primary_muscle: "back",
    equipment: "dumbbell",
    description:
      "lie on a bench, arms overhead with a dumbbell. stretch-based lat and chest move.",
    aliases: ["db pullover", "db pullovers", "db pull over", "incline db pullover"],
  },
  {
    name: "Face Pull",
    primary_muscle: "shoulders",
    equipment: "cable",
    description:
      "rope face pull to the forehead. rear delts, external rotators, rhomboids. shoulder health builder.",
    aliases: ["face pulls", "face pull"],
  },
  {
    name: "Back Extension",
    primary_muscle: "back",
    equipment: "other",
    description:
      "hip-extension move on a 45 or glute-ham bench. primarily spinal erectors and glutes.",
    aliases: ["back extensions", "back extensions (45)"],
  },
  {
    name: "Weighted Back Extension",
    primary_muscle: "back",
    equipment: "other",
    description:
      "back extension holding a plate or dumbbell. loaded spinal erectors and glutes.",
    aliases: ["weighted back extension"],
  },
  {
    name: "Single-Arm Hanging Shrug",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "hang from a bar with one arm and shrug up. isolates the lower trap and scapular retractors.",
    aliases: ["single arm hanging shrug"],
  },
  {
    name: "Dumbbell Shrug",
    primary_muscle: "back",
    equipment: "dumbbell",
    description:
      "stand with dumbbells, shrug shoulders up and slightly back. traps isolation.",
    aliases: ["db shrug"],
  },
  {
    name: "Prone Trap Raise",
    primary_muscle: "back",
    equipment: "dumbbell",
    description:
      "face-down on an incline bench, raise dumbbells at a Y angle. lower traps and rear delts.",
    aliases: ["prone trap reaise"],
  },
  {
    name: "Y Raise",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "face-down Y-shaped raise with light dumbbells. rear delts and lower traps.",
    aliases: ["y raises", "y-raise"],
  },
  {
    name: "Trap-3 Raise",
    primary_muscle: "back",
    equipment: "dumbbell",
    description:
      "face-down raise targeting the lower trap. elbow lifts at a 45-degree angle relative to the torso.",
    aliases: ["trap-3 raises"],
  },
  {
    name: "Prone Swimmer",
    primary_muscle: "back",
    equipment: "bodyweight",
    description:
      "face-down on the floor, arms tracing the swimming motion. low-trap and mid-back endurance.",
    aliases: ["prone swimmer", "prone swimmers"],
  },

  // ===== shoulders =====
  {
    name: "Overhead Press",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "standing barbell press from shoulders to lockout. full-body stability, shoulder and tricep strength.",
    aliases: [
      "shoulder press",
      "bb shoulder press",
      "seated overhead press",
      "behind the neck shoulder press",
      "shoulder press (behind the neck)",
    ],
  },
  {
    name: "Push Press",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "overhead press with a leg drive. lets you move heavier loads than a strict press.",
    aliases: ["push press"],
  },
  {
    name: "Dumbbell Shoulder Press",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "seated or standing with dumbbells. bigger range than barbell, each shoulder works independently.",
    aliases: [
      "db shoulder press",
      "seated db shoulder press",
      "dumbbell shoulder press",
    ],
  },
  {
    name: "Arnold Press",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "dumbbell press that rotates from palms-in to palms-out. hits all three deltoid heads.",
    aliases: ["arnold press"],
  },
  {
    name: "Z Press",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "seated on the floor, legs straight, press overhead. removes leg drive; exposes weak core and shoulder mobility.",
    aliases: ["z press"],
  },
  {
    name: "Landmine Press",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "press one end of an anchored bar overhead at an angle. shoulder-friendly; hits front delts and serratus.",
    aliases: [
      "landmine press",
      "single arm landmine press",
      "landmind press",
      "landmine press - standing",
    ],
  },
  {
    name: "Dumbbell Lateral Raise",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "dumbbells raised to the sides until arms are parallel to the floor. side delts isolation.",
    aliases: [
      "lateral raise",
      "lateral raises",
      "lateral db flies",
      "leaning db lateral raise",
      "db l-lateral raise",
      "lateral shoulder raise",
      "single arm lateral raise",
    ],
  },
  {
    name: "Cable Lateral Raise",
    primary_muscle: "shoulders",
    equipment: "cable",
    description:
      "cable from the low pulley, raise to the side. constant tension across the full range.",
    aliases: [],
  },
  {
    name: "Dumbbell Rear Delt Fly",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "bent-over reverse fly with dumbbells. rear delts and mid-back retraction.",
    aliases: ["reverse db flies", "reverse db fly", "reverse fly"],
  },
  {
    name: "Dumbbell Front Raise",
    primary_muscle: "shoulders",
    equipment: "dumbbell",
    description:
      "raise a dumbbell straight in front to shoulder height. front delt isolation.",
    aliases: [
      "front raise",
      "front raises",
      "standing db front raises",
      "front-lateral-front raises",
    ],
  },
  {
    name: "Barbell High Pull",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "explosive pull from below the knee to the chest. traps, rear delts, power development.",
    aliases: ["bb high pull", "high pull"],
  },
  {
    name: "Barbell Upright Row",
    primary_muscle: "shoulders",
    equipment: "barbell",
    description:
      "bar pulled vertically to chin height. traps and side delts. use a wider grip to save the shoulder.",
    aliases: ["upright bb row"],
  },

  // ===== biceps =====
  {
    name: "Barbell Curl",
    primary_muscle: "biceps",
    equipment: "barbell",
    description:
      "standing barbell curl. straightforward biceps builder; elbows pinned to the sides.",
    aliases: [
      "bb curl",
      "bb bicep curl",
      "bb bicep curls",
      "bicep curl - barbell",
    ],
  },
  {
    name: "EZ-Bar Curl",
    primary_muscle: "biceps",
    equipment: "barbell",
    description:
      "barbell curl on an EZ bar. easier on the wrists than a straight bar.",
    aliases: [
      "ez bar curl",
      "ez bar curls",
      "ez bar bicep curl",
      "ez-bar curl",
      "ez-bar curls",
    ],
  },
  {
    name: "EZ-Bar Reverse Curl",
    primary_muscle: "forearms",
    equipment: "barbell",
    description:
      "pronated grip ez-bar curl. brachialis and forearm extensors; grows grip strength.",
    aliases: [
      "ez bar bicep curl (reverse grip)",
      "reverse grip ez bar curl",
      "reverse grip ez bar curls",
    ],
  },
  {
    name: "Dumbbell Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "alternating or simultaneous dumbbell curls. full range of motion and independent arms.",
    aliases: ["db bicep curl", "db bicep curls", "bicep curl"],
  },
  {
    name: "Hammer Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "neutral-grip dumbbell curl. hits the brachialis and brachioradialis in addition to the biceps.",
    aliases: ["hammer curl", "hammer curls", "db hammer curls", "hammer bar curls"],
  },
  {
    name: "Incline Dumbbell Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "seated on an incline bench, curl dumbbells. stretches the long head of the biceps.",
    aliases: ["incline db curl", "incline curl", "incline curls", "incline bicep curl"],
  },
  {
    name: "Preacher Curl",
    primary_muscle: "biceps",
    equipment: "barbell",
    description:
      "curl over a preacher bench. eliminates body english and isolates the short head.",
    aliases: ["preacher curl", "preacher curls"],
  },
  {
    name: "Spider Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "chest-supported on an incline bench facing down, arms hang freely. biceps contraction with no momentum.",
    aliases: ["spider curl"],
  },
  {
    name: "Concentration Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "seated single-arm curl with the elbow braced against the thigh. strict peak contraction.",
    aliases: ["concentration curl", "concentraion curl", "concentraion curls"],
  },
  {
    name: "Cable Bicep Curl",
    primary_muscle: "biceps",
    equipment: "cable",
    description:
      "standing cable curl. constant tension across the whole rep.",
    aliases: [
      "cable curl",
      "cable curls",
      "cable bicep curl",
      "bicep cable curl",
      "two arm cable curl",
    ],
  },
  {
    name: "Reverse Grip Cable Curl",
    primary_muscle: "forearms",
    equipment: "cable",
    description:
      "pronated-grip cable curl. forearm-dominant, brachialis and brachioradialis.",
    aliases: ["reverse grip cable curl", "reverse grip cable curls"],
  },
  {
    name: "Overhead Cable Curl",
    primary_muscle: "biceps",
    equipment: "cable",
    description:
      "standing between two cables, curl toward the head. peak-contraction biceps.",
    aliases: ["overhead cable curl"],
  },
  {
    name: "Zottman Curl",
    primary_muscle: "biceps",
    equipment: "dumbbell",
    description:
      "curl up supinated, rotate to pronated at the top, lower with pronated grip. biceps plus forearms.",
    aliases: ["zottman curl", "zottman curls"],
  },
  {
    name: "Reverse Grip Dumbbell Bicep Curl",
    primary_muscle: "forearms",
    equipment: "dumbbell",
    description:
      "pronated dumbbell curl. forearm extensors and brachialis emphasis.",
    aliases: ["reverse grip db bicep curl"],
  },

  // ===== triceps =====
  {
    name: "Cable Tricep Pushdown",
    primary_muscle: "triceps",
    equipment: "cable",
    description:
      "straight bar pushdown. elbows pinned, only the forearms move. classic tricep isolation.",
    aliases: [
      "tricep pushdown",
      "tricep pushdowns",
      "revers grip tricep pushdown",
      "reverse grip tricep pushdown",
      "tricep pushdown reverse grip",
      "tricep reverse grip pushdown",
      "single arm tricep pushdown",
      "single arm tricep pulldown",
    ],
  },
  {
    name: "Tricep Rope Pushdown",
    primary_muscle: "triceps",
    equipment: "cable",
    description:
      "rope attachment pushdown, flare the rope apart at the bottom. emphasizes the lateral head.",
    aliases: [
      "tricep rope pushdown",
      "tricep rope pulldown",
    ],
  },
  {
    name: "V-Bar Tricep Pushdown",
    primary_muscle: "triceps",
    equipment: "cable",
    description:
      "v-handle pushdown. slight inward grip for the long head of the tricep.",
    aliases: [
      "v-bar pushdown",
      "v-bar tricep pushdown",
      "tricep v-bar pushdown",
      "tricep vbar pushdown",
    ],
  },
  {
    name: "Overhead Tricep Cable Extension",
    primary_muscle: "triceps",
    equipment: "cable",
    description:
      "cable held behind the head, arms straight up. long-head tricep stretch at the bottom.",
    aliases: [
      "oh tricep cable extension",
      "oh tricep extensions",
      "oh tricep extension",
      "overhead tricep cable ext",
      "overhead tricep extension",
      "overhead tricep extension cable",
      "tricep oh cable extension",
    ],
  },
  {
    name: "Skull Crusher",
    primary_muscle: "triceps",
    equipment: "barbell",
    description:
      "lying EZ-bar tricep extension to the forehead. elbows stay pointed up.",
    aliases: ["skull crusher", "skull crushers", "skullcrushers", "db skull crusher"],
  },
  {
    name: "Tricep Kickback",
    primary_muscle: "triceps",
    equipment: "dumbbell",
    description:
      "bent-over single-arm tricep extension. peak contraction at full elbow lockout.",
    aliases: [
      "tricep kickback",
      "tricep kickbacks",
      "db kickbacks",
      "bent-over tricep kickbacks",
      "single arm tricep kickback",
      "single arm tricep extension",
      "single arm tricep ext",
    ],
  },

  // ===== quads =====
  {
    name: "Back Squat",
    primary_muscle: "quads",
    equipment: "barbell",
    description:
      "bar on upper back, squat below parallel. the main lower-body compound. quads, glutes, core.",
    aliases: ["bb back squat", "back squat", "deep back squat"],
  },
  {
    name: "Front Squat",
    primary_muscle: "quads",
    equipment: "barbell",
    description:
      "bar on front deltoids, elbows up. more quad-dominant than back squat; demands wrist and thoracic mobility.",
    aliases: ["bb front squat", "front squat"],
  },
  {
    name: "Goblet Squat",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "dumbbell or kettlebell held at chest. upright torso squat; great for teaching depth.",
    aliases: ["goblet squat", "cyclist goblet squat", "cyclst squat"],
  },
  {
    name: "Dumbbell Squat",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "dumbbells at the sides or at the shoulders. volume work without a barbell.",
    aliases: ["db squat"],
  },
  {
    name: "Air Squat",
    primary_muscle: "quads",
    equipment: "bodyweight",
    description:
      "unloaded squat for warm-up or conditioning. depth, speed, and total reps.",
    aliases: ["air squat", "air squats"],
  },
  {
    name: "Split Squat",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "static lunge stance, drop the back knee to the floor. unilateral quad and glute work.",
    aliases: ["split squat", "front split squat", "front split squats"],
  },
  {
    name: "Bulgarian Split Squat",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "rear foot elevated on a bench. heavy quad and glute unilateral, exposes imbalances.",
    aliases: ["bulgarian split squat", "bulgarian split squats"],
  },
  {
    name: "Lunge",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "step forward, drop the back knee. quad-and-glute with balance demand.",
    aliases: [
      "alternating lunge",
      "walking lunges",
      "db walking lunges",
      "lunge - alternating - barbell",
      "lunges (total)",
    ],
  },
  {
    name: "Pistol Squat",
    primary_muscle: "quads",
    equipment: "bodyweight",
    description:
      "single-leg squat, non-working leg held out straight. strength, mobility, balance.",
    aliases: ["pistol", "pistols (total)", "clsutered pistol squats"],
  },
  {
    name: "Leg Press",
    primary_muscle: "quads",
    equipment: "machine",
    description:
      "plate-loaded machine squat pattern. high loads with minimal spinal demand.",
    aliases: ["leg press"],
  },
  {
    name: "Hack Squat",
    primary_muscle: "quads",
    equipment: "machine",
    description:
      "sled-based squat machine. stronger quad bias than free-weight squats.",
    aliases: ["hack squat"],
  },
  {
    name: "Leg Extension",
    primary_muscle: "quads",
    equipment: "machine",
    description:
      "seated quad isolation. pause at the top for a stronger contraction.",
    aliases: [
      "leg extension",
      "leg extensions",
      "quad extensions",
      "single leg extensions",
    ],
  },
  {
    name: "Step-up",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "step onto a box holding dumbbells. single-leg drive. keep the working foot flat.",
    aliases: [
      "db box step ups",
      "db box step up (alternating)",
      "db box step ups with kick",
      "db steps ups",
      "step up - l - dumbell",
      "step up - r - dumbell",
      "lateral box step ups",
      "lateral box step up",
    ],
  },

  // ===== hamstrings / glutes =====
  {
    name: "Leg Curl",
    primary_muscle: "hamstrings",
    equipment: "machine",
    description:
      "seated or lying machine curl. hamstring isolation; pause in the contracted position.",
    aliases: [
      "leg curl",
      "hamstring curl",
      "hamstring curls",
      "machine hamstring curls",
      "prone hamstring curl",
      "prone cable hamstring curl",
      "prone db hamstring curl",
      "dumbbell hamstring curl",
      "single leg curl",
      "single leg hamstring curl",
    ],
  },
  {
    name: "Nordic Curl",
    primary_muscle: "hamstrings",
    equipment: "bodyweight",
    description:
      "kneeling; lower under control with the feet anchored, catch with the hands. advanced hamstring eccentric.",
    aliases: ["nordic curl", "ghd nordic curl", "reverse nordics"],
  },
  {
    name: "Glute Ham Raise",
    primary_muscle: "hamstrings",
    equipment: "machine",
    description:
      "glute-ham developer bend and straighten. covers both hip extension and knee flexion.",
    aliases: ["glute ham raise"],
  },
  {
    name: "Hip Thrust",
    primary_muscle: "glutes",
    equipment: "barbell",
    description:
      "barbell across the hips, back on a bench. heavy hip-extension work for glute strength and size.",
    aliases: ["bb hip thrust", "hip thrust", "hip thrusts"],
  },
  {
    name: "Glute Bridge",
    primary_muscle: "glutes",
    equipment: "bodyweight",
    description:
      "lie on the floor, drive hips up. bodyweight or weighted glute contraction.",
    aliases: [
      "glute bridges",
      "glute bridge",
      "single leg glute bridge",
    ],
  },

  // ===== calves =====
  {
    name: "Standing Calf Raise",
    primary_muscle: "calves",
    equipment: "machine",
    description:
      "load on the shoulders or hips, rise on the toes. straight-knee calves (gastrocnemius).",
    aliases: [
      "standing calf raises",
      "calf raise - standing",
      "calf raises",
      "21 calf raises",
      "single leg standing calf raises",
      "calves",
    ],
  },
  {
    name: "Seated Calf Raise",
    primary_muscle: "calves",
    equipment: "machine",
    description:
      "seated knees-bent calf raise. biases the soleus instead of the gastroc.",
    aliases: ["seated calf raises"],
  },
  {
    name: "Single-Leg Calf Raise",
    primary_muscle: "calves",
    equipment: "bodyweight",
    description:
      "one-legged calf raise for a bigger stretch and load per leg.",
    aliases: ["single leg calf raise"],
  },

  // ===== core =====
  {
    name: "Plank",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "hold a rigid push-up position on forearms. full-body bracing pattern.",
    aliases: ["plank", "front plank", "l side plank", "r side plank"],
  },
  {
    name: "Hanging Leg Raise",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "hang from a bar, raise the legs to parallel or higher. lower abs and hip flexors.",
    aliases: [
      "hanging leg raises",
      "hanging knee raises",
      "hanging leg raises",
      "p bar leg raises",
      "p-bar leg raises",
      "p bar leg raises",
      "bench leg raises",
      "leg raises",
      "leg lifts",
      "straddle leg raises",
    ],
  },
  {
    name: "V-up",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "sit-up variation: arms and legs meet in the middle. full abdominal contraction.",
    aliases: ["v-ups", "bench v-ups", "half v-ups", "v-ups with med ball exchange"],
  },
  {
    name: "Crunch",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "lying flexion of the torso. upper abs isolation.",
    aliases: ["crunches", "decline crunches", "bicycle crunches", "bicycles"],
  },
  {
    name: "Cable Crunch",
    primary_muscle: "core",
    equipment: "cable",
    description:
      "kneel under a cable, crunch down. loaded abdominal flexion; progress by weight.",
    aliases: ["cable crunches"],
  },
  {
    name: "Sit-up",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "full torso flexion from lying flat to upright.",
    aliases: ["situps", "ghd sit-up", "ghd situps"],
  },
  {
    name: "Ab Rollout",
    primary_muscle: "core",
    equipment: "other",
    description:
      "ab wheel or barbell rollout from knees. strong anti-extension core challenge.",
    aliases: [
      "ab roller",
      "kneeling ab rollout",
      "kneeling rollouts",
      "ab wheel rollout",
    ],
  },
  {
    name: "Oblique Crunch",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "side-bending crunch, typically on a GHD. oblique isolation.",
    aliases: ["oblique crunch (ghd)"],
  },
  {
    name: "Russian Twist",
    primary_muscle: "core",
    equipment: "other",
    description:
      "seated, lean back, rotate the torso side-to-side with a weight. rotational core endurance.",
    aliases: ["russian twist"],
  },
  {
    name: "Dead Bug",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "lying on back, extend opposite arm and leg. anti-extension and anti-rotation.",
    aliases: ["deadbug - iso - alternating"],
  },
  {
    name: "Knees-to-Elbows",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "hang from a bar, bring knees to touch the elbows. big lower-ab and grip challenge.",
    aliases: ["knees-to-elbows", "knee-to-elbow"],
  },
  {
    name: "Toes-to-Bar",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "hang from a bar, bring toes up to touch it. strict or kipping.",
    aliases: [],
  },

  // ===== conditioning / plyometric =====
  {
    name: "Box Jump",
    primary_muscle: "quads",
    equipment: "other",
    description:
      "jump onto a box, stand tall, step down. explosive lower-body power.",
    aliases: ["box jump", "box jumps"],
  },
  {
    name: "Burpee",
    primary_muscle: "full_body",
    equipment: "bodyweight",
    description:
      "drop to a push-up, jump back to standing, hop. conditioning staple.",
    aliases: ["burpees"],
  },
  {
    name: "Mountain Climber",
    primary_muscle: "core",
    equipment: "bodyweight",
    description:
      "in a plank, alternate driving the knees toward the chest. core and cardio.",
    aliases: ["mountain climbers"],
  },
  {
    name: "Double Under",
    primary_muscle: "calves",
    equipment: "other",
    description:
      "jump rope, with the rope passing under feet twice per jump. conditioning and calf work.",
    aliases: ["double unders"],
  },
  {
    name: "Row (Erg)",
    primary_muscle: "full_body",
    equipment: "machine",
    description:
      "rowing machine. full-body conditioning with posterior-chain bias.",
    aliases: ["250m row", "run"],
  },
  {
    name: "Wall Ball",
    primary_muscle: "quads",
    equipment: "other",
    description:
      "front squat into a high throw to a target. crossfit conditioning staple.",
    aliases: ["wall ball shots"],
  },
  {
    name: "Thruster",
    primary_muscle: "quads",
    equipment: "barbell",
    description:
      "front squat straight into an overhead press. explosive full-body compound.",
    aliases: ["thruster"],
  },
  {
    name: "Power Clean",
    primary_muscle: "full_body",
    equipment: "barbell",
    description:
      "pull the bar from the floor to the front rack in a single explosive move. power lift.",
    aliases: ["power clean"],
  },

  // ===== mobility / accessory =====
  {
    name: "Cossack Squat",
    primary_muscle: "quads",
    equipment: "bodyweight",
    description:
      "wide stance, shift weight fully to one bent leg while keeping the other straight. adductor mobility and unilateral strength.",
    aliases: ["cossack squat"],
  },
  {
    name: "Jefferson Curl",
    primary_muscle: "back",
    equipment: "barbell",
    description:
      "slow barbell spinal flexion, one vertebra at a time. spinal mobility, not for loading heavy.",
    aliases: ["jefferson curl"],
  },
  {
    name: "Goblet Side Lunge",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "side step into a deep lunge holding a dumbbell at the chest. inner thigh and glute work.",
    aliases: ["goblet side lunge"],
  },
  {
    name: "Overhead Lunge",
    primary_muscle: "quads",
    equipment: "dumbbell",
    description:
      "lunge with a weight held overhead. strong core and shoulder stability demand.",
    aliases: ["oh lunge"],
  },
  {
    name: "Overhead Squat",
    primary_muscle: "quads",
    equipment: "barbell",
    description:
      "squat with the bar locked out overhead. requires full shoulder and ankle mobility.",
    aliases: ["oh squat"],
  },

  // ===== hip machines =====
  {
    name: "Hip Abduction Machine",
    primary_muscle: "glutes",
    equipment: "machine",
    description:
      "seated machine, press legs outward. glute medius / minimus isolation.",
    aliases: [
      "abduction",
      "abductor",
      "abductors",
      "machine abduction",
      "glute abductor",
    ],
  },
  {
    name: "Hip Adduction Machine",
    primary_muscle: "quads",
    equipment: "machine",
    description:
      "seated machine, press legs together. inner thigh isolation.",
    aliases: [
      "adduction",
      "adductor",
      "adductors",
      "machine adduction",
      "groin adductor",
    ],
  },

  // ===== kettlebell =====
  {
    name: "Kettlebell Swing",
    primary_muscle: "glutes",
    equipment: "kettlebell",
    description:
      "hip-hinge into an explosive swing to chest or eye level. powerful posterior-chain conditioning.",
    aliases: ["kb swing", "kb swings"],
  },
  {
    name: "Kettlebell Halo",
    primary_muscle: "shoulders",
    equipment: "kettlebell",
    description:
      "kettlebell circled around the head. shoulder mobility warm-up.",
    aliases: ["kb halo", "plate halo"],
  },
  {
    name: "External Rotation",
    primary_muscle: "shoulders",
    equipment: "cable",
    description:
      "cable or dumbbell external rotation. rotator cuff health; side delts not involved.",
    aliases: ["external rotation"],
  },
  {
    name: "Woodchop",
    primary_muscle: "core",
    equipment: "cable",
    description:
      "diagonal rotational cable pull from high to low (or reverse). rotational core strength.",
    aliases: ["high woodchop", "low woodchop", "standing landmine rotations"],
  },
  {
    name: "Glute Kickback",
    primary_muscle: "glutes",
    equipment: "cable",
    description:
      "single-leg cable kickback. glute max isolation.",
    aliases: [],
  },
  {
    name: "Tibialis Raise",
    primary_muscle: "calves",
    equipment: "bodyweight",
    description:
      "lift the toes up against resistance. strengthens the front of the shin, knee health.",
    aliases: ["tibia raises"],
  },
];
