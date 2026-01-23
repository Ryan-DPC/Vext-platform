# Cinemachine Volume Settings Extension

Use the Cinemachine Volume Settings [extension](concept-procedural-motion.md#extensions) to attach an HDRP/URP VolumeSettings profile to a CinemachineCamera.

The Cinemachine Volume Settings extension holds a Volume Settings Profile asset to apply to a CinemachineCamera when it is activated. If the camera is blending with another CinemachineCamera, then the blend weight is applied to the Volume Settings effects also.

To add a Volume Settings profile to a CinemachineCamera

1. Select your CinemachineCamera in the [Scene](https://docs.unity3d.com/Manual/UsingTheSceneView.html) view or [Hierarchy](https://docs.unity3d.com/Manual/Hierarchy.html) window.

2. In the [Inspector](https://docs.unity3d.com/Manual/UsingTheInspector.html), choose **Add Extension > CinemachineVolumeSettings**, then configure the Profile asset to have the effects you want when this CinemachineCamera is live.

> [!NOTE]
> In some cases, particularly when blending to and from empty profiles, you might get a sudden change or pop in the effects. If this happens, the best solution is to avoid blending to and from empty profiles by adding effects with default settings. If this is not practical, then you can add `CINEMACHINE_TRANSPARENT_POST_PROCESSING_BLENDS` to your project's scripting defines. However, this has the side effect of making postprocessing blends more transparent in their center, possibly revealing global effects behind them.

## Properties:

| **Property:** || **Function:** |
|:---||:---|
| **Profile** || The Volume Settings profile to activate when this CinemachineCamera is live. |
| **Focus Tracks Target** || This is obsolete, please use **Focus Tracking**. |
| **Focus Tracking** || If the profile has the appropriate overrides, will set the base focus distance to be the distance from the selected target to the camera. The **Focus Offset** field will then modify that distance. |
|| _None_ | No focus tracking |
|| _Look At Target_ | Focus offset is relative to the LookAt target |
|| _Follow Target_ | Focus offset is relative to the Follow target |
|| _Custom Target_ | Focus offset is relative to the Custom target |
|| _Camera_ | Focus offset is relative to the camera |
| **Focus Target** || The target to use if **Focus Tracks Target** is set to _Custom Target_ |
| **Focus Offset** || Used when **Focus Tracking** is not _None_. Offsets the sharpest point away from the location of the focus target. |
| **Weight** || The weight of the dynamic volume that will be created, when the camera is fully blended in. This will blend to and from 0 along with the camera.|
