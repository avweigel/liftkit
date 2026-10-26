// short how-tos for the exercises in the programs, keyed by slug with any
// left/right suffix removed. "how" is the movement, "cues" are what to
// check mid-set. written for a 5 am gym and for keeping the ribs down.
export type HowTo = { how: string; cues: string[] };

const H: Record<string, HowTo> = {
  // ----- core -----
  "90-90-hip-lift": {
    how: "Lie on your back with your feet on the wall, knees and hips at 90 degrees. Press your heels into the wall and lift your tailbone a few centimetres. Breathe in through your nose, then breathe all the way out until your ribs drop.",
    cues: ["Lower back stays flat on the floor", "Full exhale, pause, then inhale", "Feel the back of your thighs, not your lower back"],
  },
  "wall-slides": {
    how: "Stand with your back, head and arms against the wall, elbows bent like a goalpost. Slide your arms up as far as you can without anything leaving the wall, then pull them back down.",
    cues: ["Ribs stay down, lower back stays near the wall", "Stop where your ribs start to lift", "Slow on the way down"],
  },
  "dead-bug": {
    how: "Lie on your back with your arms pointing at the ceiling and your knees over your hips. Lower one arm and the opposite leg toward the floor, exhale, then bring them back and switch.",
    cues: ["Lower back pressed into the floor the whole time", "Only go as low as you can without arching", "Exhale as you reach"],
  },
  "front-hold-march": {
    how: "Hold a kettlebell or plate out in front of you at chest height with straight arms. March on the spot, lifting each knee to hip height, slow and steady.",
    cues: ["The weight tries to pull your ribs up: keep them down", "No lean back as the knee comes up", "Long exhale every few steps"],
  },
  "half-kneeling-dumbbell-woodchop": {
    how: "Kneel on one knee with a dumbbell held in both hands up by the shoulder on the side of the up knee. Chop it slowly down and across to the opposite hip, then bring it back.",
    cues: ["Hips stay square to the front", "Ribs down, the chop comes from the trunk", "Exhale on the way down"],
  },
  "half-kneeling-one-arm-overhead-press": {
    how: "Kneel on one knee with a light dumbbell at the shoulder on the same side as the down knee. Press straight up and lower slowly.",
    cues: ["Ribs stay down at the top. If they lift, stop the set", "No side lean", "Glute of the down leg squeezed"],
  },
  "long-lever-hard-plank": {
    how: "Forearm plank with your elbows a hand's width ahead of your shoulders and your feet together. Squeeze your glutes, pull your elbows toward your toes without moving, and breathe out long and slow. Hold for the time.",
    cues: ["Tailbone tucked slightly, no sag in the low back", "Ribs down the whole hold. If they lift, the set is over", "Once 45 s is clean, a plate on your back"],
  },
  "kettlebell-figure-8s": {
    how: "Wide stance, knees bent, chest up. Pass the bell around the outside of one leg, through your legs to the other hand, then around the outside of the other leg. Keep the eight going.",
    cues: ["Hips low and still, the bell moves, you don't", "Ribs down, flat back", "Exhale as the bell passes through"],
  },
  "reverse-lunge-twist": {
    how: "Hold a dumbbell at your chest. Step one foot back into a lunge, then rotate your trunk toward the front leg and back. Step up and switch legs.",
    cues: ["Turn from the ribs, hips stay forward", "Exhale as you rotate", "Front knee stays over the foot"],
  },
  "bear-hold-kettlebell-slide": {
    how: "Hands and toes on the floor, knees an inch up, back flat. A kettlebell sits beside one hand. Reach across with the other hand, slide the bell to the other side, and put the hand back down.",
    cues: ["Hips don't sway or rotate", "Knees stay off the floor", "Exhale as you slide"],
  },
  "slow-leg-lowers": {
    how: "On your back with your legs straight up and your arms by your sides. Lower one leg slowly toward the floor while breathing out, stop just before your lower back lifts, and bring it back. Once that's clean every rep, lower both legs together.",
    cues: ["Lower back stays pressed down", "Belly stays flat, no doming", "Slower on the way down than the way up"],
  },
  "side-plank-reach-through": {
    how: "Side plank on your forearm, top arm reaching to the ceiling. Thread the top arm under your body as you rotate toward the floor, then open back up.",
    cues: ["Hips stay lifted and stacked", "Exhale as you rotate under", "Turn from the ribs, not the hips"],
  },
  "side-plank": {
    how: "Lie on your side on one forearm, elbow under the shoulder. Lift your hips so you're in a straight line from head to feet and hold.",
    cues: ["Hips forward, not piked back", "Bottom ribs pull toward the hip", "Breathe slowly"],
  },
  "copenhagen-with-twist": {
    how: "Side plank with your top leg on a bench and the bottom leg free. Lift your hips, then rotate your top arm under your body and back up. Extend and crunch is one rep.",
    cues: ["Slow and controlled", "Exhale as you rotate", "Inner thigh of the top leg does the work"],
  },
  "pallof-press": {
    how: "Stand side-on to a cable at chest height, handle at your chest. Press it straight out in front of you, hold for a breath, and bring it back without letting it pull you round.",
    cues: ["Hips and shoulders stay square", "Ribs down, glutes on", "The cable should never win"],
  },
  "bear-hold": {
    how: "On hands and knees, tuck your toes and lift your knees an inch off the floor. Hold with a flat back.",
    cues: ["Push the floor away", "Back stays flat, no sagging", "Breathe behind your ribs"],
  },
  "bear-crawl": {
    how: "From a bear hold with knees an inch up, crawl forward with opposite hand and foot together, small steps, then back.",
    cues: ["Knees stay low", "Hips stay level, no rocking", "Slow and quiet"],
  },
  "bird-dog": {
    how: "On hands and knees, reach one arm forward and the opposite leg back until they're level with your body. Hold for 3 seconds, come back down, switch sides.",
    cues: ["Imagine a glass of water on your lower back", "Leg only as high as your hip", "Exhale as you reach"],
  },
  "body-saw": {
    how: "Forearm plank with your feet on a towel or sliders. Push through your forearms to slide back 2 to 3 inches, then pull forward again.",
    cues: ["Stop before your lower back sags or ribs flare", "Glutes squeezed", "Knees down to make it easier"],
  },
  "reverse-crunch": {
    how: "Lie on your back with knees bent over your hips. Curl your pelvis off the floor, bringing your knees toward your chest, then lower slowly.",
    cues: ["Curl, don't swing", "Exhale as you lift", "Lower back comes down one vertebra at a time"],
  },
  "cable-crunch": {
    how: "Kneel facing a high cable with the rope by your head. Crunch your ribs toward your hips, rounding your back, then come up slowly.",
    cues: ["Hips stay still, the spine bends", "Exhale hard at the bottom", "Watch for doming down the middle"],
  },
  "ab-wheel-rollout": {
    how: "Kneel with your hands on the wheel under your shoulders. Roll forward slowly as far as you can keep a flat back, then pull back to the start.",
    cues: ["Stop before your back arches", "Ribs down, glutes squeezed", "Short range is fine"],
  },
  "suitcase-carry": {
    how: "Hold one heavy dumbbell at your side and walk tall. Switch hands for the way back.",
    cues: ["Don't lean toward the weight", "Ribs stacked over hips", "Slow, even steps"],
  },
  "half-kneeling-cable-chop": {
    how: "Kneel on one knee side-on to a high cable. Pull the handle down and across your body to the opposite hip, then let it back up with control.",
    cues: ["Hips stay square", "Turn through the upper back", "Ribs down"],
  },
  "half-kneeling-cable-lift": {
    how: "Kneel side-on to a low cable. Pull the handle up and across your body to above the opposite shoulder, then lower with control.",
    cues: ["Stop before you lean back", "Hips stay square", "Exhale on the lift"],
  },
  crunch: {
    how: "Lie on your back, knees bent. Curl your head and shoulders up by pulling your ribs toward your hips, then lower.",
    cues: ["Exhale as you curl", "Chin tucked", "Small range"],
  },
  // ----- legs -----
  "back-squat": {
    how: "Bar on your upper back, feet about shoulder width. Brace, sit down between your heels, then drive up.",
    cues: ["Big breath and brace before each rep", "Knees track over toes", "Chest and hips rise together"],
  },
  "front-squat": {
    how: "Bar resting on the front of your shoulders, elbows high. Squat down upright, then drive up.",
    cues: ["Elbows up the whole time", "Stay tall", "Brace before each rep"],
  },
  "goblet-squat": {
    how: "Hold one dumbbell at your chest. Squat down between your knees and stand back up.",
    cues: ["Elbows inside the knees at the bottom", "Chest tall", "Whole foot on the floor"],
  },
  deadlift: {
    how: "Bar over mid-foot. Hinge down, grip just outside your legs, brace, and push the floor away until you're standing tall.",
    cues: ["Bar stays against your legs", "Back flat, chest proud", "Finish with glutes, don't lean back"],
  },
  "romanian-deadlift": {
    how: "Stand with the bar at your hips. Push your hips back with soft knees and slide the bar down your thighs until you feel your hamstrings, then stand.",
    cues: ["Hips back, not down", "Bar close to your legs", "Back flat"],
  },
  "dumbbell-rdl": {
    how: "Hold dumbbells in front of your thighs. Push your hips back with soft knees until you feel your hamstrings, then stand up.",
    cues: ["Hips back, not down", "Dumbbells close to your legs", "Back flat"],
  },
  "split-squat": {
    how: "One foot forward, one back, in a long stance. Lower your back knee toward the floor, then push up through the front foot. All reps on one side, then switch.",
    cues: ["Front knee over the foot", "Torso tall", "Back knee lightly kisses the floor"],
  },
  "bulgarian-split-squat": {
    how: "Back foot on a bench, front foot forward. Lower straight down until the front thigh is level, then push back up.",
    cues: ["Most of the weight on the front leg", "Torso slightly forward", "Control the bottom"],
  },
  "leg-press": {
    how: "Feet shoulder width on the platform. Lower until your knees are around 90 degrees, then press back up without locking out.",
    cues: ["Lower back stays on the pad", "Knees track over toes", "Don't lock the knees"],
  },
  "leg-extension": {
    how: "Sit with the pad on your shins. Straighten your legs, squeeze at the top, then lower slowly.",
    cues: ["Pause at the top", "Slow on the way down", "Hold the handles"],
  },
  "leg-curl": {
    how: "Pad just above your heels. Curl your heels toward your glutes, then lower slowly.",
    cues: ["Hips stay down", "Slow on the way down", "Full range"],
  },
  "hip-abduction-machine": {
    how: "Sit with the pads outside your knees. Push your knees apart, pause, then bring them back slowly.",
    cues: ["Sit tall or lean slightly forward", "Pause at the widest point", "Don't let the weights slam"],
  },
  "hip-adduction-machine": {
    how: "Sit with the pads inside your knees. Squeeze your knees together, pause, then open slowly.",
    cues: ["Slow on the way out", "Sit tall", "Pause when they meet"],
  },
  "back-extension": {
    how: "Hips on the pad, feet locked in. Lower your chest toward the floor, then lift until your body is straight. Not further.",
    cues: ["Squeeze glutes to come up", "Stop at straight, don't overarch", "Ribs down at the top"],
  },
  "single-leg-glute-machine": {
    how: "Set up on the machine with one foot on the plate. Press it back and up with your glute, then return slowly. All reps on one side, then switch.",
    cues: ["Hips stay square", "Don't arch your lower back", "Pause at the top"],
  },
  "smith-machine-hip-thrust": {
    how: "Upper back on a bench, bar across your hips with a pad. Drive your hips up until your body is flat, squeeze, then lower.",
    cues: ["Chin tucked, ribs down", "Shins vertical at the top", "Pause and squeeze"],
  },
  "hip-thrust": {
    how: "Upper back on a bench, bar across your hips. Drive your hips up until your body is flat, squeeze, then lower.",
    cues: ["Chin tucked, ribs down", "Shins vertical at the top", "Pause and squeeze"],
  },
  "glute-bridges": {
    how: "Lie on your back, knees bent, feet flat. Push through your heels to lift your hips until your body is straight, squeeze, lower.",
    cues: ["Ribs down, no arching", "Squeeze for 2 seconds", "Push through your heels"],
  },
  "frog-pumps": {
    how: "Lie on your back with the soles of your feet together and knees out. Pump your hips up with a glute squeeze, then lower.",
    cues: ["Small and quick", "Squeeze at the top", "Ribs down"],
  },
  "cable-pull-through": {
    how: "Face away from a low cable with the rope between your legs. Hinge back, then drive your hips forward to stand tall.",
    cues: ["Hips back, not down", "Finish with glutes", "Arms just hold on"],
  },
  "cable-glute-kickback": {
    how: "Ankle strap on, facing the cable. Kick the leg straight back with a slight bend, squeeze, return slowly.",
    cues: ["Don't arch your lower back", "Hips square", "Pause at the back"],
  },
  "standing-cable-hip-abduction": {
    how: "Ankle strap on the outside leg, side-on to a low cable. Lift the leg out to the side, then lower slowly.",
    cues: ["Stay tall, no leaning", "Toes forward", "Slow return"],
  },
  "walking-lunges": {
    how: "Step forward into a lunge, back knee toward the floor, then step through into the next one.",
    cues: ["Torso tall", "Front knee over the foot", "Push through the front heel"],
  },
  "calf-press-on-leg-press": {
    how: "Balls of your feet on the bottom edge of the leg press plate, legs straight. Press with your toes, then lower your heels slowly.",
    cues: ["Full stretch at the bottom", "Pause at the top", "Knees soft, not locked"],
  },
  "standing-calf-raise": {
    how: "Balls of your feet on the step. Rise as high as you can, pause, then lower your heels below the step.",
    cues: ["Full range", "Pause at the top", "Slow on the way down"],
  },
  "tibialis-raise": {
    how: "Lean your back on a wall with your heels a step out. Lift your toes as high as you can, then lower.",
    cues: ["Legs straight", "Full range", "Slow and controlled"],
  },
  "cossack-squat": {
    how: "Wide stance. Shift into one hip and squat down on that leg while the other leg stays straight, toes up. Push back to the middle and switch.",
    cues: ["Heel of the bent leg stays down", "Chest tall", "Only as low as you control"],
  },
  "wide-squat-pulses": {
    how: "Wide stance, toes turned out. Lower to a deep squat and pulse a few centimetres up and down.",
    cues: ["Knees track over toes", "Stay low", "Tall chest"],
  },
  "side-lying-leg-raise": {
    how: "Lie on your side, legs straight. Lift the top leg, then lower with control.",
    cues: ["Toes forward, not up", "Hips stacked", "Slow"],
  },
  "dumbbell-swing": {
    how: "Hold one dumbbell with both hands. Hinge to swing it between your legs, then snap your hips forward to float it to chest height.",
    cues: ["It's a hinge, not a squat", "Arms just guide", "Stand tall at the top"],
  },
  // ----- upper -----
  "bench-press": {
    how: "Lie on the bench with eyes under the bar. Lower the bar to your lower chest, then press it back up.",
    cues: ["Shoulder blades pulled together", "Feet planted", "Bar path slightly back on the way up"],
  },
  "dumbbell-bench-press": {
    how: "Lie on the bench with a dumbbell in each hand at chest level. Press them up over your chest, then lower slowly.",
    cues: ["Shoulder blades back and down", "Elbows about 45 degrees from your body", "Control the bottom"],
  },
  "smith-machine-incline-press": {
    how: "Bench at about 30 degrees under the Smith bar. Lower it to your upper chest, press back up.",
    cues: ["Shoulder blades back", "Elbows slightly tucked", "Ribs down"],
  },
  "overhead-press": {
    how: "Bar at your collarbones. Press it straight up, moving your head back and then through, until it's overhead.",
    cues: ["Squeeze glutes so you don't lean back", "Ribs down", "Finish with the bar over your mid-foot"],
  },
  "dumbbell-shoulder-press": {
    how: "Dumbbells at shoulder height, palms forward. Press up until your arms are straight, then lower.",
    cues: ["Ribs down, no arching", "Glutes on", "Control the way down"],
  },
  "dumbbell-lateral-raise": {
    how: "Dumbbells at your sides. Raise them out to the side to shoulder height, then lower slowly.",
    cues: ["Lead with the elbows", "Slight bend in the elbows", "No swinging"],
  },
  "chin-up": {
    how: "Hang with palms facing you. Pull your chest toward the bar, then lower all the way down.",
    cues: ["Start by pulling shoulders down", "Ribs down, no swinging", "Full hang at the bottom"],
  },
  "dumbbell-row": {
    how: "One hand and knee on a bench, dumbbell in the other hand. Row it to your hip, then lower. All reps on one side, then switch.",
    cues: ["Pull toward your hip, not your chest", "Back flat", "Don't twist"],
  },
  "chest-supported-dumbbell-row": {
    how: "Lie face down on an incline bench with a dumbbell in each hand. Row them up to your sides, squeeze, lower.",
    cues: ["Chest stays on the pad", "Squeeze shoulder blades", "Slow on the way down"],
  },
  "single-arm-cable-row": {
    how: "Sit or stand facing the cable. Row the handle to your side, then let your arm reach forward again.",
    cues: ["Don't twist", "Shoulder down", "Elbow close"],
  },
  "face-pull": {
    how: "Rope at upper chest height. Pull it toward your face, hands ending beside your ears.",
    cues: ["Elbows high", "Squeeze shoulder blades", "Slow return"],
  },
  "single-arm-cable-rear-delt-fly": {
    how: "Cable at shoulder height, pulling across your body with the opposite hand. Sweep the arm out to the side with a slight bend.",
    cues: ["Lead with the elbow", "Don't twist", "Light weight"],
  },
  "push-up": {
    how: "Hands under your shoulders, body straight. Lower your chest to the floor, then push back up.",
    cues: ["Body moves as one piece", "Elbows about 45 degrees", "Ribs down, glutes on"],
  },
  "hammer-curl": {
    how: "Dumbbells at your sides, palms facing each other. Curl them up, then lower slowly.",
    cues: ["Elbows stay at your sides", "No swinging", "Slow on the way down"],
  },
  "incline-dumbbell-curl": {
    how: "Sit back on an incline bench with your arms hanging. Curl the dumbbells up, then lower all the way.",
    cues: ["Elbows stay back", "Full stretch at the bottom", "Slow"],
  },
  "cable-bicep-curl": {
    how: "Face a low cable. Curl the handle up, then lower slowly.",
    cues: ["Elbows at your sides", "Squeeze at the top", "No leaning back"],
  },
  "high-cable-curl": {
    how: "Stand between two high cables, arms out. Curl the handles toward your head.",
    cues: ["Upper arms stay still", "Squeeze at the top", "Slow return"],
  },
  "preacher-curl": {
    how: "Upper arm flat on the preacher pad. Curl the dumbbell up, then lower until your arm is almost straight. All reps on one side, then switch.",
    cues: ["Don't lift off the pad", "Slow on the way down", "Don't fully lock out"],
  },
  "cable-tricep-pushdown": {
    how: "Face a high cable. Push the bar down until your arms are straight, then let it come back up to your chest.",
    cues: ["Elbows pinned at your sides", "Squeeze at the bottom", "Slow return"],
  },
  "tricep-rope-pushdown": {
    how: "Face a high cable with the rope. Push down and spread the rope at the bottom.",
    cues: ["Elbows pinned at your sides", "Spread the rope at the bottom", "Slow return"],
  },
  "overhead-tricep-extension": {
    how: "Hold one dumbbell overhead with both hands. Lower it behind your head, then press back up.",
    cues: ["Elbows point forward", "Ribs down, no arching", "Full stretch"],
  },
  "overhead-cable-tricep-extension": {
    how: "Face away from the cable with the rope overhead. Extend your arms forward and up, then return.",
    cues: ["Elbows stay high", "Ribs down", "Slow return"],
  },
  thruster: {
    how: "Bar in the front rack. Squat down, then drive up and use that to press the bar overhead in one motion.",
    cues: ["Elbows high in the squat", "Drive with the legs", "Ribs down overhead"],
  },
  // ----- cardio -----
  "incline-walk": {
    how: "Treadmill at a brisk walk on an incline. Follow the timer for each incline change.",
    cues: ["Hands off the rails", "Ribs stacked over hips", "Breathe through your nose if you can"],
  },
  "assault-bike": {
    how: "Push and pull with your arms while you pedal. The harder you work, the more resistance you get.",
    cues: ["Sit tall", "Drive with the legs", "Arms help, legs lead"],
  },
  run: {
    how: "Easy running at a pace you could talk at, unless the plan says otherwise.",
    cues: ["Relaxed shoulders", "Short, light steps", "Breathe low"],
  },
};

const ALIAS: Record<string, string> = {
  "bb-back-squat": "back-squat",
  "glute-bridge": "glute-bridges",
  "standing-calf-raise": "standing-calf-raise",
  "tibia-raises": "tibialis-raise",
};

export function howTo(slug: string, name = ""): HowTo | null {
  // "split-squat-l" and "preacher-curl-r" share a how-to with their pair
  const base = slug.replace(/-(l|r)$/, "");
  const hit = H[base] ?? H[ALIAS[base] ?? ""];
  if (hit) return hit;
  // a name fallback for exercises whose slug was made differently
  const byName = name
    .toLowerCase()
    .replace(/\((l|r)\)|\s-\s(l|r)$/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return H[byName] ?? null;
}
