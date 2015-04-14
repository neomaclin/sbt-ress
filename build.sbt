import bintray.Keys._

sbtPlugin := true

organization := "org.neolin.sbt"

name := "sbt-ress"

version := "1.0.0"

scalaVersion := "2.10.4"

//libraryDependencies ++= Seq(
//  "org.webjars" % "rework.css" % "1.7.5",
//  "org.webjars" % "rework.rework" % "1.7.5",
//  "org.webjars" % "rework.move-media" % "1.7.5",
//  "org.webjars" % "rework.split-media" % "1.7.5",
//  "org.webjars" % "underscorejs" % "1.8.3"
//)

resolvers += Classpaths.sbtPluginSnapshots

bintrayPublishSettings

repository in bintray := "sbt-plugins"

bintrayOrganization in bintray := None

//addSbtPlugin("com.typesafe.sbt" % "sbt-web" % "1.0.0")

addSbtPlugin("com.typesafe.sbt" %% "sbt-js-engine" % "1.0.1")

licenses += ("MIT", url("http://opensource.org/licenses/MIT"))

publishMavenStyle := false

scriptedSettings

scriptedLaunchOpts += ("-Dproject.version=" + version.value)

scriptedBufferLog := false

