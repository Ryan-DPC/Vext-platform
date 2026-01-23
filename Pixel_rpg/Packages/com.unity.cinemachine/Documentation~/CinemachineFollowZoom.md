# Cinemachine Follow Zoom

This [extension](concept-procedural-motion.md#extensions) adjusts the FOV of the lens to keep the target object at a constant size on the screen, regardless of camera and target position.

## Properties:

| **Property:** | **Function:**                                                                                                                                                           |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Width**     | The shot width to maintain, in world units, at target distance. The FOV will be adjusted so that an object of this size, at target distance, will fill the screen.      |
| **Damping**   | Increase this value to soften the responsiveness of the follow-zoom. Small numbers make the camera more responsive. Larger numbers make the camera respond more slowly. |
| **Min FOV**   | Lower limit for the FOV that this behavior generates.                                                                                                                   |
| **Max FOV**   | Upper limit for the FOV that this behavior generates.                                                                                                                   |
