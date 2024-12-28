/scenes = GetSceneList
/scene(/program) = (Get|Set)CurrentProgramScene
/scene/preview = (Get|Set)CurrentPreviewScene
/scene/(create|remove) = (Create|Remove)Scene
/scene/(name|uuid)/name = (Get|Set)SceneName

/scene/(name|uuid)/sceneTransitionOverride = (Get|Set)SceneSceneTransitionOverride

/scene/(name|uuid)/items = GetSceneItemList
/scene/(name|uuid)/item/(create|remove|duplicate) = (Create|Remove|Duplicate)SceneItem
/scene/(name|uuid)/item/(sourceName)/id ?searchOffset ?sceneName ?sceneUuid = GetSceneItemId
/scene/(name|uuid)/item/(name|uuid|id)/source = GetSceneItemSource
/scene/(name|uuid)/item/(name|uuid|id)/(transform|enabled|locked|blendmode|index) = (Get|Set)SceneItem(Transform|Enabled|Locked|BlendMode|Index)

(alias /inputs)
/sources = GetInputList
/sources/kinds = GetInputKindList
/sources/special = GetSpecialInputs
/source/(create|remove) = (Create|Remove)Input
/source/(name|uuid)/active = GetSourceActive
/source/(name|uuid)/screenshot/(get|save) = (Get|Save)SourceScreenshot
/source/(name|uuid)/filter/(create|remove) = (Create|Remove)SourceFilter
/source/(name|uuid)/media/status = GetMediaInputStatus
/source/(name|uuid)/media/cursor (#|+/-#) = (Set|Offset)MediaInputCursor
/source/(name|uuid)/media/trigger (play|pause|stop|restart|next|previous|null/none) = TriggerMediaInputAction

/filters = GetSourceFilterList
/filters/kinds = GetSourceFilterKindList
/filters/kind/(filterName)/??defaultSettings?? = GetSourceFilterDefaultSettings

/transitions = GetSceneTransitionList
/transitions/kinds = GetTransitionKindList
/transition/current (transitionName) = (Get|Set)CurrentSceneTransition
/transition/current/(duration|settings) = (Get|Set)CurrentSceneTransition(Duration|Settings)
/transition/current/cursor = GetCurrentSceneTransitionCursor
/transition/studiomode/trigger = TriggerStudioModeTransition

/source/(name|uuid)/name newName = SetInputName
/source/*/audio/(balance|…)

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

Accept arguments as json AND array of key=value pairs