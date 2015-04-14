package org.neolin.sbt.ress

import sbt._
import sbt.Keys._
import com.typesafe.sbt.web.{PathMapping, SbtWeb}
import com.typesafe.sbt.web.pipeline.Pipeline
import com.typesafe.sbt.jse.{SbtJsEngine, SbtJsTask}

import spray.json._

object Import {


  case class Dimension(min: Int, max: Int)
  implicit val dimensionWrites = new JsonWriter[Dimension] {
    def write(dimension: Dimension) = JsObject( Map("min" -> JsNumber(dimension.min), "max" -> JsNumber(dimension.max)) )
  }

  case class Media(device: String, width: Dimension, height: Dimension, mediaType: List[String], orientation: List[String])

  implicit val mediaWrites = new JsonWriter[Media] {
    def write(media: Media) = JsObject(
          Map("device" -> JsString(media.device),
              "width" -> media.width.toJson,
              "height" -> media.height.toJson,
              "type" -> JsArray(media.mediaType.map(JsString(_))),
              "orientation" -> JsArray(media.orientation.map(JsString(_)))
        ))
  }

  val ress = TaskKey[Pipeline.Stage]("ress", "Invoke the ress optimizer.")

  object RessKeys {

    val medias = SettingKey[Seq[Media]]("medias", ".")

  }

}

object SbtRess extends AutoPlugin {

  override def requires = SbtJsTask

  override def trigger = AllRequirements
  
  case class Result(filesRead: List[String], filesWritten: List[String])

  val autoImport = Import

  import SbtWeb.autoImport._
  import WebKeys._
  import SbtJsEngine.autoImport.JsEngineKeys
  import SbtJsTask.autoImport.JsTaskKeys._
  import autoImport.RessKeys._
  import autoImport._


  // val defaultMedias = List( 
  //   Media("m", Dimension(320, 639), Dimension(480,640),List("print","screen"),List("landscape")),
  //   Media("t", Dimension(640, 959), Dimension(600,1024),Nil,Nil),
  //   Media("d", Dimension(960, 639), Dimension(768,900),Nil,Nil)
  //   )


  override def projectSettings: Seq[Setting[_]] = Seq(
    includeFilter in ress := "*.min.css",
    excludeFilter in ress := HiddenFileFilter,
    //medias :=  medias.value,
    ress := ressFiles.value
    )

  def ressFiles: Def.Initialize[Task[Pipeline.Stage]] = Def.task {
    mappings =>
      val targetDir = webTarget.value / ress.key.label
      val include = (includeFilter in ress).value
      val exclude = (excludeFilter in ress).value
      
      val optimizerMappings = mappings.filter(f => !f._1.isDirectory && include.accept(f._1) && !exclude.accept(f._1))
    
      val jsOptions = JsArray(medias.value.map(_.toJson).toList).toString
      
      val shellSource = 
          SbtWeb.copyResourceTo(
            (target in Plugin).value / moduleName.value,
            getClass.getClassLoader.getResource("ress.js"),
            streams.value.cacheDirectory / "copy-resource"
          )
      
      //Copy the files to targget directory 
      SbtWeb.syncMappings(
        streams.value.cacheDirectory,
        optimizerMappings,
        targetDir
      )
     
      val optimizingMappingsJs = JsArray(targetDir.***.get.toSet.filter(_.isFile).map(f => JsString(f.toURI.toString.replace("file:",""))).toList).toString
      
      streams.value.log.info("Optimizing CSS with RESS")
     
      SbtJsTask.executeJs(
        state.value,
        JsEngineKeys.EngineType.Node,
        (JsEngineKeys.command in ress).value,
        Nil,
        shellSource,
        Seq(optimizingMappingsJs, jsOptions),
        (timeoutPerSource in ress).value * optimizerMappings.size
      )

      val optimizedMappings = targetDir.***.get.toSet.filter(_.isFile).pair(relativeTo(targetDir))
     
      (mappings.toSet -- optimizerMappings.toSet ++ optimizedMappings).toSeq 
  }


}