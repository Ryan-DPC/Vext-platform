# Cinemachine Confiner 3D

Use the **Cinemachine Confiner 3D** [extension](concept-procedural-motion.md#extensions) to limit the camera’s position to a volume.

The camera’s position in 3D is confined to a volume.

| **Property:**        |     | **Function:**                                                                                                                                                                                      |
| :------------------- | :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bounding Volume**  |     | The 3D volume to contain the camera in.                                                                                                                                                            |
| **Slowing Distance** |     | Size of the slow-down zone at the edge of the bounding volume. When the camera is moving towards an edge and is within this distance of it, it will slow down gradually until the edge is reached. |
