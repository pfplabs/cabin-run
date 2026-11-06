# Western lake exploration

Three shared routes extend the lake loop: Lake Overlook (V), Cedar Cove (C),
and Pine Clearing (P). Each has a six-metre gravel access road, a 24-metre
turnaround, small lakeside furnishings, approach guide signs, and an outbound
STOP sign and stop bar. Slow below 3 m/s inside the turnaround to discover a
stop. The session counter persists when changing vehicles and resets on restart.

Each clockwise approach has a 3.4-metre asphalt right-turn pocket with an entry
taper, broken divider, arrow, and closing taper. Counterclockwise arrivals use a
normal left turn across the opposing lane; there is no separate center turn lane.
The original main-loop centerline remains continuous and yellow. Junction edge
markings open into the new roads. Existing US signs and the pier plane berth are
preserved (base 25bf8f0, including 54b18af).

Routes are defined once in exploration-routes.js and shared by tyre heights,
terrain, gravel dust, foliage exclusions, rendering, discovery, and minimap.
Terrain refinement is restricted to the three junction regions; the complete
terrain remains within the existing 240,000-triangle budget (239,304 triangles).
New scenery is static, under 40 mesh draws before the nine added traffic signs;
all lane paint is merged into one mesh. No additional lights or animation loops.

Validation: 162 Node tests pass. New tests drive each access road out and back
with the real simulation, perform a low-speed U-turn, check dry turnarounds,
verify grade and tyre/terrain alignment, and check bounded finite scenery.
Chrome verified the right-turn pocket, gravel arrival, discovery toast, and map
counter. Screenshots: ../evidence in task-23 (outside this checkout).
No mobile performance measurements or complete manual lake lap were performed.

Preview: http://127.0.0.1:4193/
Targeted QA: ?qa=1&explore=cove&junction=1 starts at the turn pocket after Start;
?qa=1&explore=cove starts near the destination. Also accepts overlook and picnic.
Normal URLs retain the cabin start. The QA URL controls are only active with qa.

Integration: cherry-pick the exploration commit onto the integrator's 25bf8f0
or newer branch. No changes to road-signs.js are necessary: extra signs use
createRoadSigns(heightAt, extraSigns) and turnoffStopPlacement from that base.
