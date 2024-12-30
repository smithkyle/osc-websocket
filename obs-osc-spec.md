
/scenes = GetSceneList
/scene(/program) (name|uuid) = (Get|Set)CurrentProgramScene
/scene/preview (name|uuid) = (Get|Set)CurrentPreviewScene
/scene/(create|remove) (name|uuid) = (Create|Remove)Scene
/scene/(name|uuid)/items = GetSceneItemList
/scene/(name|uuid)/item/(create|remove|duplicate) = (Create|Remove|Duplicate)SceneItem
/scene/(name|uuid)/item/(sourceName)/id ?searchOffset ?sceneName ?sceneUuid = GetSceneItemId
/scene/(name|uuid)/item/(name|uuid|id)/source = GetSceneItemSource
/scene/(name|uuid)/item/(name|uuid|id)/(transform|enabled|locked|blendmode|index) = (Get|Set)SceneItem(Transform|Enabled|Locked|BlendMode|Index)
/scene/(name|uuid)/name = (Get|Set)SceneName
/scene/(name|uuid)/sceneTransitionOverride = (Get|Set)SceneSceneTransitionOverride

/scene/transitions = GetSceneTransitionList
/scene/transitions/kinds = GetTransitionKindList
/scene/transition/current (transitionName) = (Get|Set)CurrentSceneTransition
/scene/transition/current/(duration|settings) = (Get|Set)CurrentSceneTransition(Duration|Settings)
/scene/transition/current/cursor = GetCurrentSceneTransitionCursor
/transition/studiomode/trigger = TriggerStudioModeTransition

(alias /inputs)
/sources/?kindTypes = GetInputList
/source/kinds = GetInputKindList
/sources/special = GetSpecialInputs
/source/filter/kinds = GetSourceFilterKindList
/source/filter/kind/(filterKind)/??defaultSettings?? = GetSourceFilterDefaultSettings
/source/(create|remove) = (Create|Remove)Input
/source/(name|uuid)/active = GetSourceActive
/source/(name|uuid)/audio/(balance|…)
/source/(name|uuid)/filters = GetSourceFilterList
/source/(name|uuid)/filter/(create|remove) = (Create|Remove)SourceFilter
/source/(name|uuid)/media/status = GetMediaInputStatus
/source/(name|uuid)/media/cursor (#|+/-#) = (Set|Offset)MediaInputCursor
/source/(name|uuid)/media/trigger (play|pause|stop|restart|next|previous|null/none) = TriggerMediaInputAction
/source/(name|uuid)/name newName = SetInputName
/source/(name|uuid)/screenshot/(get|save) = (Get|Save)SourceScreenshot

/output/virtualcam/(status|toggle|start|stop)
/output/replaybuffer/(status|starts|stop|toggle|save)
/output/replaybuffer/last
/outputs = GetOutputList
/output/(name)/(status|start|stop|toggle|settings)

/stream/(status|toggle|start|stop)

/record/(status|toggle|start|stop|pause|resume)
/record/pause/toggle
/record/split
/record/createchapter chapterName

Accept arguments as json AND array of key=value pairs?

Array of available/default endpoints for a given path? (i.e. request params?)