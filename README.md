# sbt-ress
Ress Asset pipeline plugin for SbtWeb

# Note
Do not use this directly in any production enviroment, it has a high dependency with internal project setup. I have not yet setup any of the related webjar required for deployment. please only use it as an reference if needed.

#Sample excecution:
node ress.js "[\"global.min.css\"]"  "[{\"device\": \"m\", \"width\": {\"min\":320,\"max\":639}, \"height\":{\"min\":480,\"max\":640}, \"breakpoint\": 767, \"type\": [\"print\",\"screen\"], \"orientation\": [\"landscapre\"] }, {\"device\": \"t\", \"width\": {\"min\":640,\"max\":959}, \"height\":{\"min\":600,\"max\":1024}, \"breakpoint\": 2048, \"type\": [], \"orientation\": [] }, {\"device\": \"d\", \"width\": {\"min\":960,\"max\":2048}, \"height\":{\"min\":768,\"max\":900}, \"breakpoint\": 0, \"type\": [], \"orientation\": [] }]"