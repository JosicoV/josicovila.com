<?php
    //ESTRUCTURA DE DATOS
    //Discos > [nombre, nombrejs, imagen, video, texto, canciones[]]
    //Canciones > [nombre, nombrejs, texto, ruta]

    $disco = 
[
    [
        "nombre" => "Dragon Rage",
        "nombrejs" => "DraRa",
        "imagen" => "DragonRage.jpg",
        "video" => "icono.mp4",
        "texto" => "<p>Thematic album about dragons life.</p>",
        "colores" => [
            "color1" => "rgb(60,76,84)",
            "color2" => "rgb(238,176,127)",
            "color3" => "rgb(106,135,149)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(60,76,84, 0.2)",
            "color2" => "rgba(238,176,127, 0.2)",
            "color3" => "rgba(106,135,149, 0.1)",
        ],
        "canciones" => [
            [
                "nombre" => "Riding Oriental Winds",
                "nombrejs" => "RoWin",
                "texto" => "<p>Time to fly far away.</p>",
                "ruta" => "DragonRage/1Riding_Oriental_Winds.mp3"
            ],
            [
                "nombre" => "Blue Fire Nest",
                "nombrejs" => "BLFne",
                "texto" => "<p>The nest of royalty.</p>",
                "ruta" => "DragonRage/2Blue_fire_nest.mp3"
            ],
            [
                "nombre" => "First Flight (Leaving the Nest)",
                "nombrejs" => "FFLtn",
                "texto" => "<p>The time has come.</p>",
                "ruta" => "DragonRage/3First_flight(leaving_the_nest).mp3"
            ],
            [
                "nombre" => "The Night Glides",
                "nombrejs" => "ThNgli",
                "texto" => "<p>Let's fly together.</p>",
                "ruta" => "DragonRage/4the_night_glides.mp3"
            ],
            [
                "nombre" => "Dracones Venandi",
                "nombrejs" => "DraVe",
                "texto" => "<p>Hunt with and for family.</p>",
                "ruta" => "DragonRage/5dracones_venandi.mp3"
            ],
            [
                "nombre" => "Wind in My Wings",
                "nombrejs" => "WiinMW",
                "texto" => "<p>The pleasure of flying.</p>",
                "ruta" => "DragonRage/6Wind_in_my wings.mp3"
            ],
            [
                "nombre" => "Flying Through Clouds",
                "nombrejs" => "FlThclo",
                "texto" => "<p>Time to relax.</p>",
                "ruta" => "DragonRage/7Flying_through_clouds.mp3"
            ],
            [
                "nombre" => "Dragon Rage",
                "nombrejs" => "DrageGon",
                "texto" => "<p>Don't make me angry.</p>",
                "ruta" => "DragonRage/8Dragon_Rage.mp3"
            ],
            [
                "nombre" => "Learning To Fly",
                "nombrejs" => "LeaTFl",
                "texto" => "<p>The very first time.</p>",
                "ruta" => "DragonRage/9_learning_to_fly.mp3"
            ],
            [
                "nombre" => "Drakonian Warcry",
                "nombrejs" => "Drawar",
                "texto" => "<p>Are you ready?.</p>",
                "ruta" => "DragonRage/10Drakonian_Warcry.mp3"
            ],
        ] // cierra canciones
    ], //Cierra Dragon Rage
    [
        "nombre" => "Black & White",
        "nombrejs" => "Bawhi",
        "imagen" => "blackAndWhite.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Trying to put light on my dark side.</p>",
        "colores" => [
            "color1" => "rgb(132,132,132)",
            "color2" => "rgb(124,98,71)",
            "color3" => "rgb(255,255,255)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(132,132,132, 0.3)",
            "color2" => "rgba(124,98,71, 0.3)",
            "color3" => "rgba(255,255,255,0.2)",
        ],
        "canciones" => [
            [
                "nombre" => "Misunderstood Tales",
                "nombrejs" => "Mista",
                "texto" => "<p>When you think you get the moral of the story.</p>",
                "ruta" => "blackAndWhite/1misunderstoodTales.mp3"
            ],
            [
                "nombre" => "Reach the Truth",
                "nombrejs" => "Retru",
                "texto" => "<p>It is just around the corner.</p>",
                "ruta" => "blackAndWhite/2reachTheTruth.mp3"
            ],
            [
                "nombre" => "Whisper a Lie to Me",
                "nombrejs" => "Walito",
                "texto" => "<p>But that can become reality.</p>",
                "ruta" => "blackAndWhite/3whisperALieToMe.mp3"
            ],
            [
                "nombre" => "Land of No Return",
                "nombrejs" => "laNRe",
                "texto" => "<p>Will you come beyond with me?</p>",
                "ruta" => "blackAndWhite/4landOfNoReturn.mp3"
            ],
            [
                "nombre" => "Mind Without Frontiers",
                "nombrejs" => "MiwFro",
                "texto" => "<p>Everyone has potential.</p>",
                "ruta" => "blackAndWhite/5mindWithoutFrontiers.mp3"
            ],
            [
                "nombre" => "Red Tattoo Dream",
                "nombrejs" => "ReTdre",
                "texto" => "<p>One of my recursive dreams.</p>",
                "ruta" => "blackAndWhite/6redTatooDream.mp3"
            ],
            [
                "nombre" => "What I Carry With Me",
                "nombrejs" => "WICwme",
                "texto" => "<p>Allways trying to mix heavy and classic music.</p>",
                "ruta" => "blackAndWhite/7whatICarryWithMe.mp3"
            ],
            [
                "nombre" => "Let the Wolf Out",
                "nombrejs" => "LehWou",
                "texto" => "<p>For Dan and Queen. I miss you.</p>",
                "ruta" => "blackAndWhite/8letTheWolfOut.mp3"
            ],
            [
                "nombre" => "Alone In the Crowd",
                "nombrejs" => "AitCr",
                "texto" => "<p>Strange sensation.</p>",
                "ruta" => "blackAndWhite/9aloneInTheCrowd.mp3"
            ],
            [
                "nombre" => "Even and Prime",
                "nombrejs" => "evAPi",
                "texto" => "<p>It only can be a number.</p>",
                "ruta" => "blackAndWhite/10evenAndPrime.mp3"
            ],
            [
                "nombre" => "What Now?",
                "nombrejs" => "WatNo",
                "texto" => "<p>I wonder.</p>",
                "ruta" => "blackAndWhite/11whatNow_.mp3"
            ],
        ] // cierra canciones
    ], //Cierra Black & White 
    [
        "nombre" => "Once Upon a Tale, Pt.2",
        "nombrejs" => "OuaTale2",
        "imagen" => "OnceUponATale2.jpg",
        "video" => "icono.mp4",
        "texto" => "<p>Second of a series of short stories.</p>",
        "colores" => [
            "color1" => "rgb(179,195,212)",
            "color2" => "rgb(221,181,197)",
            "color3" => "rgb(88,89,90)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(179,195,212, 0.2)",
            "color2" => "rgba(221,181,197, 0.3)",
            "color3" => "rgba(88,89,90,0.1)",
        ],
        "canciones" => [
            [
                "nombre" => "The distant island",
                "nombrejs" => "thedistIsl",
                "texto" => "<p>And island far far away, or not?.</p>",
                "ruta" => "OnceUponATale2/TheDistantIsland.mp3"
            ],
            [
                "nombre" => "The Guide Girl",
                "nombrejs" => "tguidegir",
                "texto" => "<p>There are inside and outside the school.</p>",
                "ruta" => "OnceUponATale2/TheGuideGirl.mp3"
            ],
            [
                "nombre" => "Salute Yo'king",
                "nombrejs" => "salyok",
                "texto" => "<p>A bow to thy majesty</p>",
                "ruta" => "OnceUponATale2/SaluteYoking.mp3"
            ],
            [
                "nombre" => "The dark side",
                "nombrejs" => "tdarside",
                "texto" => "<p>from our satellite.</p>",
                "ruta" => "OnceUponATale2/TheDarkSide.mp3"
            ],
            [
                "nombre" => "Be a three X",
                "nombrejs" => "BathX",
                "texto" => "<p>A secret medieval soldier.</p>",
                "ruta" => "OnceUponATale2/BeAThreeX.mp3"
            ],
            [
                "nombre" => "Nocturnal fierce sea",
                "nombrejs" => "NocFiers",
                "texto" => "<p>A nightmare ocean.</p>",
                "ruta" => "OnceUponATale2/NocturnalFierceSea.mp3"
            ],
        ] // cierra canciones
    ], //Cierra Once Upon a Tale pt 2 
    [
        "nombre" => "Once Upon a Tale, Pt.1",
        "nombrejs" => "OuaTale",
        "imagen" => "OnceuponatalePt.1.jpg",
        "video" => "icono.mp4",
        "texto" => "<p>First of a series of short stories.</p>",
        "colores" => [
            "color1" => "rgb(219,113,97)",
            "color2" => "rgb(255,208,206)",
            "color3" => "rgb(226,128,79)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(219,113,97, 0.3)",
            "color2" => "rgba(255,208,206, 0.3)",
            "color3" => "rgba(226,128,79,0.1)",
        ],
        "canciones" => [
            [
                "nombre" => "The cry of the elves",
                "nombrejs" => "tcoelves",
                "texto" => "<p>Elves crying for their land.</p>",
                "ruta" => "Onceuponatalept1/Thecryoftheelves.mp3"
            ],
            [
                "nombre" => "Ivory Castle",
                "nombrejs" => "Icastle",
                "texto" => "<p>Lonely and majestic castle.</p>",
                "ruta" => "Onceuponatalept1/IvoryCastle.mp3"
            ],
            [
                "nombre" => "Valley of the dragons",
                "nombrejs" => "Votdragons",
                "texto" => "<p>Explore the ancient valley.</p>",
                "ruta" => "Onceuponatalept1/Thevalleyofthedragons.mp3"
            ],
            [
                "nombre" => "Tales of the enchanted sword",
                "nombrejs" => "Totesword",
                "texto" => "<p>Try to get it.</p>",
                "ruta" => "Onceuponatalept1/Talesoftheenchantedsword.mp3"
            ],
            [
                "nombre" => "The reason",
                "nombrejs" => "Treason",
                "texto" => "<p>the one and only.</p>",
                "ruta" => "Onceuponatalept1/Thereason.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Once upon a tale Pt.1
    [
        "nombre" => "I just can't say Farewell",
        "nombrejs" => "ICF",
        "imagen" => "Ijustcantsayfarewell.jpg",
        "video" => "icono.mp4",
        "texto" => "<p>I like to say 'See you later', never 'farewell'</p>",
        "colores" => [
            "color1" => "rgb(244,174,138)",
            "color2" => "rgb(103,34,53)",
            "color3" => "rgb(31,31,55)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(244,174,138, 0.2)",
            "color2" => "rgba(103,34,53, 0.3)",
            "color3" => "rgba(31,31,55, 0.2)",
        ],
        "canciones" => [
            [
                "nombre" => "Pegasus",
                "nombrejs" => "pegasus",
                "texto" => "<p>The beautiful winged horse</p>",
                "ruta" => "IJustCantSayFarewell/Pegasus.mp3"
            ],
            [
                "nombre" => "Live",
                "nombrejs" => "live",
                "texto" => "<p>Live every moment as if it were the last</p>",
                "ruta" => "IJustCantSayFarewell/Live.mp3"
            ],
            [
                "nombre" => "The right side of an orange",
                "nombrejs" => "therightside",
                "texto" => "<p>Dedicated to my nephews and the study times we enjoy</p>",
                "ruta" => "IJustCantSayFarewell/The-right-side-of-an-orange.mp3"
            ],
            [
                "nombre" => "Dark Blue Horizon",
                "nombrejs" => "darkblue",
                "texto" => "<p>Moments of starry skies that I like to admire</p>",
                "ruta" => "IJustCantSayFarewell/Dark-Blue-Horizon.mp3"
            ],
            [
                "nombre" => "Believe",
                "nombrejs" => "believe",
                "texto" => "<p>It is the first step to move forward</p>",
                "ruta" => "IJustCantSayFarewell/Believe.mp3"
            ],
            [
                "nombre" => "Light Awaits",
                "nombrejs" => "lightawaits",
                "texto" => "<p>For those who know how to find it</p>",
                "ruta" => "IJustCantSayFarewell/light-awaits.mp3"
            ],
            [
                "nombre" => "Re-encarnación",
                "nombrejs" => "reencarnacion",
                "texto" => "<p>Dedicated to an aunt of mine. Good for two or more</p>",
                "ruta" => "IJustCantSayFarewell/Re-encarnacion.mp3"
            ],
            [
                "nombre" => "Short message from'er soul",
                "nombrejs" => "shortmessage",
                "texto" => "<p>So I imagine a message from one of my grandmothers. Wherever she is.</p>",
                "ruta" => "IJustCantSayFarewell/Short-message-fromer-soul.mp3"
            ],
            [
                "nombre" => "Thanks to my gipsy roots",
                "nombrejs" => "thanksto",
                "texto" => "<p>It is good to thank the roots that form us</p>",
                "ruta" => "IJustCantSayFarewell/Thanks-to-my-gipsy-roots.mp3"
            ],
            [
                "nombre" => "Feel",
                "nombrejs" => "fell",
                "texto" => "<p>Whatever you do feel it</p>",
                "ruta" => "IJustCantSayFarewell/Feel.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco I just cant say Farewell
    [
        "nombre" => "Feel, Believe, Live",
        "nombrejs" => "FBL",
        "imagen" => "Feel-Believe-Live.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Great little single with three songs that will close the next album. I have been told many things about the title and the cover, for me, it is very metaphysical: it is a mix between religion and science.</p>",
        "colores" => [
            "color1" => "rgb(244,174,138)",
            "color2" => "rgb(103,34,53)",
            "color3" => "rgb(31,31,55)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(244,174,138, 0.3)",
            "color2" => "rgba(103,34,53, 0.2)",
            "color3" => "rgba(31,31,55, 0.2)",
        ],
        "canciones" => [
            [
                "nombre" => "Feel",
                "nombrejs" => "feel",
                "texto" => "<p>Whatever you do feel it</p>",
                "ruta" => "FeelBelieveLive/Feel.mp3"
            ],
            [
                "nombre" => "Believe",
                "nombrejs" => "believe",
                "texto" => "<p>It is the first step to move forward</p>",
                "ruta" => "FeelBelieveLive/Believe.mp3"
            ],
            [
                "nombre" => "Live",
                "nombrejs" => "live",
                "texto" => "<p>Live every moment as if it were the last</p>",
                "ruta" => "FeelBelieveLive/Live.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Feel, Believe, Live
    [
        "nombre" => "9",
        "nombrejs" => "disco9",
        "imagen" => "9.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Nine songs, on the ninth album called 9. It begins with a chase in the forest to go through the Iberian fields, dream that you play like a child and embark in search of the magical island Avalon. But there is much more. You can not lose this.</p>",
        "colores" => [
            "color1" => "rgb(76,36,20)",
            "color2" => "rgb(212,188,164)",
            "color3" => "rgb(97,66,47)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(76,36,20, 0.1)",
            "color2" => "rgba(212,188,164, 0.2)",
            "color3" => "rgba(97,66,47, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Chase in the woods",
                "nombrejs" => "chaseInTheWoods",
                "texto" => "<p>Experience a frantic chase through a thick forest</p>",
                "ruta" => "9/Chase.mp3"
            ],
            [
                "nombre" => "Iberian fields",
                "nombrejs" => "iberianFields",
                "texto" => "<p>Walk through epic fields of Iberia</p>",
                "ruta" => "9/Iberian.mp3"
            ],
            [
                "nombre" => "Dreaming of playing like a child, pt.1",
                "nombrejs" => "dreaming1",
                "texto" => "<p>Dream that you play as if you were a child</p>",
                "ruta" => "9/Dreaming1.mp3"
            ],
            [
                "nombre" => "Dreaming of playing like a child, pt.2",
                "nombrejs" => "dreaming2",
                "texto" => "<p>Dream of playing like a child again</p>",
                "ruta" => "9/Dreaming2.mp3"
            ],
            [
                "nombre" => "David, the scholar",
                "nombrejs" => "david",
                "texto" => "<p>David, the most erudite person I have ever met</p>",
                "ruta" => "9/David.mp3"
            ],
            [
                "nombre" => "Quest for Avalon",
                "nombrejs" => "avalon",
                "texto" => "<p>Go on a mission to discover the magical island of Avalon</p>",
                "ruta" => "9/Avalon.mp3"
            ],
            [
                "nombre" => "The edge of the unknown",
                "nombrejs" => "edge",
                "texto" => "<p>Look at the unknown from its border</p>",
                "ruta" => "9/Edge.mp3"
            ],
            [
                "nombre" => "Teal jewel's enigma",
                "nombrejs" => "teal",
                "texto" => "<p>Uncover the mystery of the blue-green jewel</p>",
                "ruta" => "9/Jewel.mp3"
            ],
            [
                "nombre" => "Epiphany",
                "nombrejs" => "epiphany",
                "texto" => "<p>Have an epiphany that reveals to you what you yearn for</p>",
                "ruta" => "9/Epiphany.mp3"
            ]
        ] // cierra canciones
    ], //Cierra el disco 9
    [
        "nombre" => "Experimenting on her own",
        "nombrejs" => "experimenting",
        "imagen" => "Experimenting-on-her-Own.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Experimental disc, at least in its beginning. As it progresses, everything returns to the epic and fantastic.</p>",
        "colores" => [
            "color1" => "rgb(220,220,220)",
            "color2" => "rgb(10,126,139)",
            "color3" => "rgb(60,68,68)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(220,220,220, 0.2)",
            "color2" => "rgba(10,126,139, 0.3)",
            "color3" => "rgba(60,68,68, 0.2)",
        ],
        "canciones" => [
            [
                "nombre" => "Classical is so metal",
                "nombrejs" => "classical",
                "texto" => "<p>Experimental. Discover how the classic can be merged with the heaviest sounds.</p>",
                "ruta" => "ExperimentingOnHerOwn/1.-classical-is-so-metal.mp3"
            ],
            [
                "nombre" => "Wardrums on a saturday night",
                "nombrejs" => "wardrums",
                "texto" => "<p>Experimental. The dance floor on the warpath.</p>",
                "ruta" => "ExperimentingOnHerOwn/2.-Wardrums-on-a-saturday-night.mp3"
            ],
            [
                "nombre" => "Classics go on Fiesta",
                "nombrejs" => "fiesta",
                "texto" => "<p>Experimental. What would it be like to party with a group of classical musicians.</p>",
                "ruta" => "ExperimentingOnHerOwn/3.-Classics-go-on-fiesta.mp3"
            ],
            [
                "nombre" => "Last beginning",
                "nombrejs" => "last",
                "texto" => "<p>The last start. As attractive as disturbing.</p>",
                "ruta" => "ExperimentingOnHerOwn/4.-last-beginning.mp3"
            ],
            [
                "nombre" => "Epic western",
                "nombrejs" => "western",
                "texto" => "<p>Mount your best horse to explore a western full of adventures.</p>",
                "ruta" => "ExperimentingOnHerOwn/5.-epic-western.mp3"
            ],
            [
                "nombre" => "Fall of the angel",
                "nombrejs" => "fall",
                "texto" => "<p>1st part: distressing fall of an angel from heaven</p>",
                "ruta" => "ExperimentingOnHerOwn/6.-Fall-of-the-angel.mp3"
            ],
            [
                "nombre" => "Ascension of a demon",
                "nombrejs" => "ascension",
                "texto" => "<p>2nd part: A demon wants to become part of the heavenly ranks. Listen if he gets it.</p>",
                "ruta" => "ExperimentingOnHerOwn/7.-Ascension-of-a-demon.mp3"
            ],
            [
                "nombre" => "Awekening of the humankind",
                "nombrejs" => "awakening",
                "texto" => "<p>3rd part: The awakening of humanity has taken time, listen to discover where it takes us.</p>",
                "ruta" => "ExperimentingOnHerOwn/8.-Awakening-of-the-humankind.mp3"
            ],
            [
                "nombre" => "Beyond the axiomatic truth",
                "nombrejs" => "beyond",
                "texto" => "<p>It makes sense to go beyond axiomatic truth.</p>",
                "ruta" => "ExperimentingOnHerOwn/9.-Beyond-the-axiomatic-truth.mp3"
            ],
            [
                "nombre" => "Sir Hector",
                "nombrejs" => "hector",
                "texto" => "<p>A great man well deserves his song.</p>",
                "ruta" => "ExperimentingOnHerOwn/10.-Sir-Hector.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Experimenting on her own
    [
        "nombre" => "The pathmaker",
        "nombrejs" => "pathmaker",
        "imagen" => "The-pathmaker.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Go through the astral gate to reach a new planet. Will it be habitable and will it have resources? What dangers will you find? Soundtrack of my short story El explorador.</p>",
        "colores" => [
            "color1" => "rgb(52,63,80)",
            "color2" => "rgb(100,122,155)",
            "color3" => "rgb(175,186,203)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(52,63,80, 0.3)",
            "color2" => "rgba(100,122,155, 0.2)",
            "color3" => "rgba(175,186,203, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Astral door",
                "nombrejs" => "astral",
                "texto" => "<p>The beginning of the journey.</p>",
                "ruta" => "ThePathmaker/1.-Astral-Door.mp3"
            ],
            [
                "nombre" => "Hic sunt dracones",
                "nombrejs" => "dracones",
                "texto" => "<p>Here be dragons.</p>",
                "ruta" => "ThePathmaker/2.-Hic-sunt-Dracones.mp3"
            ],
            [
                "nombre" => "Bread crumbs",
                "nombrejs" => "bread",
                "texto" => "<p>Follow the breadcrumbs like in the folk tale.</p>",
                "ruta" => "ThePathmaker/3.-Bread-Crumbs.mp3"
            ],
            [
                "nombre" => "Wounded",
                "nombrejs" => "wounded",
                "texto" => "<p>Injured. After the battle and with more dangers lurking, will you survive the wound?</p>",
                "ruta" => "ThePathmaker/4.-Wounded.mp3"
            ],
            [
                "nombre" => "Healing Wind",
                "nombrejs" => "wind",
                "texto" => "<p>Let yourself be healed by the east wind.</p>",
                "ruta" => "ThePathmaker/5.-Healing-wind.mp3"
            ],
            [
                "nombre" => "Last man standing",
                "nombrejs" => "standing",
                "texto" => "<p>You are the last man standing. Time to react.</p>",
                "ruta" => "ThePathmaker/6.-last-man-standing.mp3"
            ],
            [
                "nombre" => "A narrow passage",
                "nombrejs" => "narrow",
                "texto" => "<p>Where will the narrow passage lead?</p>",
                "ruta" => "ThePathmaker/7.-a-narrow-passage.mp3"
            ],
            [
                "nombre" => "Raven lullaby",
                "nombrejs" => "lullaby",
                "texto" => "<p>There is always time for a lullaby and more so if it is the one with the crow.</p>",
                "ruta" => "ThePathmaker/8.-raven-lullaby.mp3"
            ],
            [
                "nombre" => "Returning home",
                "nombrejs" => "home",
                "texto" => "<p>Coming home after the mission.</p>",
                "ruta" => "ThePathmaker/9.-(bonus)returning-home.mp3"
            ],           
        ] // cierra canciones
    ], //Cierra el disco The pathmaker
    [
        "nombre" => "In love or versus",
        "nombrejs" => "love",
        "imagen" => "In-love-or-Versus.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Experimental album. Discover the experiences of this imaginary couple.</p>",
        "colores" => [
            "color1" => "rgb(55,78,111)",
            "color2" => "rgb(223,223,223)",
            "color3" => "rgb(28,44,68)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(55,78,111, 0.2)",
            "color2" => "rgba(223,223,223, 0.2)",
            "color3" => "rgba(28,44,68, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "This primal feeling from you",
                "nombrejs" => "primal",
                "texto" => "<p>This primal feeling that comes to me from you.</p>",
                "ruta" => "InLoveOrVersus/This-primal-feeling-from-you.mp3"
            ],
            [
                "nombre" => "When you say Hi",
                "nombrejs" => "sayHi",
                "texto" => "<p>What do you make me feel when you say hi to me.</p>",
                "ruta" => "InLoveOrVersus/When-you-say-hi.mp3"
            ],
            [
                "nombre" => "Your crazy moments",
                "nombrejs" => "crazy",
                "texto" => "<p>Your best crazy moments that you give me.</p>",
                "ruta" => "InLoveOrVersus/Your-crazy-moments.mp3"
            ],
            [
                "nombre" => "My finger on your back",
                "nombrejs" => "myFinger",
                "texto" => "<p>What better than caressing you on the back.</p>",
                "ruta" => "InLoveOrVersus/my-finger-on-your-back.mp3"
            ],
            [
                "nombre" => "That tickels",
                "nombrejs" => "tickels",
                "texto" => "<p>That tickles... but don't stop.</p>",
                "ruta" => "InLoveOrVersus/that-tickels.mp3"
            ],
            [
                "nombre" => "A minute to be with you",
                "nombrejs" => "minute",
                "texto" => "<p>How slowly time passes when I go to meet you.</p>",
                "ruta" => "InLoveOrVersus/a-minute-to-be-with-you.mp3"
            ],
            [
                "nombre" => "Making war",
                "nombrejs" => "mkWar",
                "texto" => "<p>Not all moments are to remember.</p>",
                "ruta" => "InLoveOrVersus/making-war.mp3"
            ],
            [
                "nombre" => "The time I win",
                "nombrejs" => "timeWin",
                "texto" => "<p>The moment I win, that moment will be memorable.</p>",
                "ruta" => "InLoveOrVersus/The-time-I-win.mp3"
            ],
            [
                "nombre" => "What you give me",
                "nombrejs" => "giveMe",
                "texto" => "<p>What you give me, I will be able to return it to you.</p>",
                "ruta" => "InLoveOrVersus/What-you-give-me.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco In love or versus
    [
        "nombre" => "Dawn in Istoccar",
        "nombrejs" => "Istoccar",
        "imagen" => "Dawn-in-Istoccar.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Thematic disc about the fantastic world of Istoccar that I narrate in my book El juego de Hansik.</p>",
        "colores" => [
            "color1" => "rgb(150,110,101)",
            "color2" => "rgb(84,51,45)",
            "color3" => "rgb(100,52,34)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(150,110,101, 0.1)",
            "color2" => "rgba(84,51,45, 0.2)",
            "color3" => "rgba(100,52,34, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Dawn in Istoccar",
                "nombrejs" => "dawn",
                "texto" => "<p>Sunrise on the known continent of Istoccar.</p>",
                "ruta" => "DawnInIstoccar/Dawn-in-Istoccar.mp3"
            ],
            [
                "nombre" => "Fly no matter how far",
                "nombrejs" => "flyFar",
                "texto" => "<p>Fly high, always beyond.</p>",
                "ruta" => "DawnInIstoccar/Fly-no-matter-how-far.mp3"
            ],
            [
                "nombre" => "Inside the tower of the wizard",
                "nombrejs" => "towerWizard",
                "texto" => "<p>Inside this magical tower anything can happen.</p>",
                "ruta" => "DawnInIstoccar/InsideTheTowerOfTheWizard.mp3"
            ],
            [
                "nombre" => "Red Belt",
                "nombrejs" => "redBelt",
                "texto" => "<p>The mark of the white mage apprentice, but one she wears with pride.</p>",
                "ruta" => "DawnInIstoccar/red-belt.mp3"
            ],
            [
                "nombre" => "Galloping to Kugrant",
                "nombrejs" => "kugrant",
                "texto" => "<p>Dunk your spurs the important mission presses.</p>",
                "ruta" => "DawnInIstoccar/galloping-to-kugrant.mp3"
            ],
            [
                "nombre" => "Regunast at war",
                "nombrejs" => "regunast",
                "texto" => "<p>War has broken out in Ragunast. It will be possible to carry out the mission.</p>",
                "ruta" => "DawnInIstoccar/Regunast-at-war.mp3"
            ],
            [
                "nombre" => "Bloody and metalish",
                "nombrejs" => "metallish",
                "texto" => "<p>Bloody and metallic is the face of the hero after the battle.</p>",
                "ruta" => "DawnInIstoccar/bloody-and-metalish.mp3"
            ],
            [
                "nombre" => "Not all the answers",
                "nombrejs" => "answers",
                "texto" => "<p>You can't always get all the answers.</p>",
                "ruta" => "DawnInIstoccar/not-all-the-answers.mp3"
            ],
            [
                "nombre" => "Back cover",
                "nombrejs" => "cover",
                "texto" => "<p>Back cover and last song on the album?.</p>",
                "ruta" => "DawnInIstoccar/back-cover.mp3"
            ],
            [
                "nombre" => "Back cover (massive)",
                "nombrejs" => "backCoverM",
                "texto" => "<p>Back cover in its massive version.</p>",
                "ruta" => "DawnInIstoccar/back-cover(massive).mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Dawn in Istoccar
    [
        "nombre" => "Never without The Bards",
        "nombrejs" => "never",
        "imagen" => "Never-Without-The-Bards.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Tribute to my favorite music group (BG). Like them on their albums, in this one, I develop fantastic worlds in each song.</p>",
        "colores" => [
            "color1" => "rgb(198,178,157)",
            "color2" => "rgb(146,139,99)",
            "color3" => "rgb(212,190,164)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(198,178,157, 0.2)",
            "color2" => "rgba(146,139,99, 0.2)",
            "color3" => "rgba(212,190,164, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Ancient Ritual",
                "nombrejs" => "ancient",
                "texto" => "<p>Ancient ritual of a tribe that who knows if it ever came into existence.</p>",
                "ruta" => "NeverWithoutTheBards/ancient-ritual.mp3"
            ],
            [
                "nombre" => "Goblins path",
                "nombrejs" => "goblins",
                "texto" => "<p>The path followed by goblins aided by their chemical experiments.</p>",
                "ruta" => "NeverWithoutTheBards/goblins-path.mp3"
            ],
            [
                "nombre" => "Wizard on the cliff",
                "nombrejs" => "cliff",
                "texto" => "<p>Join this young mage as he casts his most powerful spells on top of the cliff.</p>",
                "ruta" => "NeverWithoutTheBards/Wizard-on-the-cliff.mp3"
            ],
            [
                "nombre" => "Elders will",
                "nombrejs" => "will",
                "texto" => "<p>What will be the will of the elders?</p>",
                "ruta" => "NeverWithoutTheBards/The-Elders-Will.mp3"
            ],
            [
                "nombre" => "Rise of the young heroine",
                "nombrejs" => "rise",
                "texto" => "<p>Witness the rise of the young heroine of the tribe.</p>",
                "ruta" => "NeverWithoutTheBards/Rise-of-the-young-heroine.mp3"
            ],
            [
                "nombre" => "Dragon revenge",
                "nombrejs" => "revenge",
                "texto" => "<p>A mute witness to the destruction of his world, the dragon prepares for his revenge.</p>",
                "ruta" => "NeverWithoutTheBards/dragon-revenge.mp3"
            ],
            [
                "nombre" => "And the journey ends",
                "nombrejs" => "journey",
                "texto" => "<p>Every journey comes to an end. Let's go home.</p>",
                "ruta" => "NeverWithoutTheBards/And-the-journey-ends.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Never without The Bards
    [
        "nombre" => "Night Clockwork",
        "nombrejs" => "clockwork",
        "imagen" => "Night-Clockwork.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Discover a new steampunk world with its gear wheels and lots of motor oil.</p>",
        "colores" => [
            "color1" => "rgb(123,122,121)",
            "color2" => "rgb(194,166,118)",
            "color3" => "rgb(74,72,70)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(123,122,121, 0.1)",
            "color2" => "rgba(194,166,118, 0.1)",
            "color3" => "rgba(74,72,70, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Big steam flying machine",
                "nombrejs" => "machine",
                "texto" => "<p>This great heavy steam engine is going to take flight.</p>",
                "ruta" => "BigSteamFlyingMachine/Big-steam-flying-machine.mp3"
            ],
            [
                "nombre" => "Icebreaker into the storm",
                "nombrejs" => "storm",
                "texto" => "<p>Rough sea. This icebreaker has a mission and must fulfill it.</p>",
                "ruta" => "BigSteamFlyingMachine/Icebreaker-into-the-storm.mp3"
            ],
            [
                "nombre" => "Heavy fuel hearted",
                "nombrejs" => "hearted",
                "texto" => "<p>The big machine with heavy fuel.</p>",
                "ruta" => "BigSteamFlyingMachine/Heavy-fuel-hearted.mp3"
            ],
            [
                "nombre" => "Cracked soul engine",
                "nombrejs" => "soul",
                "texto" => "<p>This motor does not run very well due to its cracked core.</p>",
                "ruta" => "BigSteamFlyingMachine/Cracked-soul-engine.mp3"
            ],
            [
                "nombre" => "Dark crimsom oil as Blood",
                "nombrejs" => "crimson",
                "texto" => "<p>The machine-men who rule the engines of this world have dark crimson oil like blood.</p>",
                "ruta" => "BigSteamFlyingMachine/Dark-Crimson-Oil-as-Blood.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Night clockwork
    [
        "nombre" => "Reunion's tavern",
        "nombrejs" => "tavern",
        "imagen" => "reunions-tavern.webp",
        "video" => "icono.mp4",
        "texto" => "<p>Second part of the first album in which the same fantastic world continues to develop.</p>",
        "colores" => [
            "color1" => "rgb(200,176,152)",
            "color2" => "rgb(152,108,45)",
            "color3" => "rgb(78,65,57)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(200,176,152, 0.2)",
            "color2" => "rgba(152,108,45, 0.1)",
            "color3" => "rgba(78,65,57, 0.3)",
        ],
        "canciones" => [
            [
                "nombre" => "Intro",
                "nombrejs" => "intro",
                "texto" => "<p>Album intro theme.</p>",
                "ruta" => "ReunionsTavern/0.-Intro.mp3"
            ],
            [
                "nombre" => "A night at the tavern",
                "nombrejs" => "aNight",
                "texto" => "<p>All good stories begin in a tavern.</p>",
                "ruta" => "ReunionsTavern/1.-a-night-at-the-tavern.mp3"
            ],
            [
                "nombre" => "The sinner mission",
                "nombrejs" => "sinner",
                "texto" => "<p>The mission of the sinner. Nemesis of the protagonist.</p>",
                "ruta" => "ReunionsTavern/2.-the-sinner-mission.mp3"
            ],
            [
                "nombre" => "Hero's pray for duty",
                "nombrejs" => "pray",
                "texto" => "<p>Night of prayer by the hero.</p>",
                "ruta" => "ReunionsTavern/3.-heros-pray-for-duty.mp3"
            ],
            [
                "nombre" => "Marching through city gates",
                "nombrejs" => "gates",
                "texto" => "<p>The army departs for battle marching through the gates of the city.</p>",
                "ruta" => "ReunionsTavern/4.-marching-through-city-gates.mp3"
            ],
            [
                "nombre" => "Hero versus sinner",
                "nombrejs" => "versusSinner",
                "texto" => "<p>Final battle. The main hero confronts the sinner.</p>",
                "ruta" => "ReunionsTavern/5.-hero-versus-sinner.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco Reunion's tavern
    [
        "nombre" => "New old world order",
        "nombrejs" => "order",
        "imagen" => "new-old-world-order.webp",
        "video" => "icono.mp4",
        "texto" => "<p>First part of the introduction to a fantastic world whose protagonists are its goddess and the industrious mining town that she protects.</p>",
        "colores" => [
            "color1" => "rgb(68,68,69)",
            "color2" => "rgb(255,120,2)",
            "color3" => "rgb(124,124,132)",
        ],
        "coloresalpha" => [
            "color1" => "rgba(68,68,69, 0.2)",
            "color2" => "rgba(255,120,2, 0.2)",
            "color3" => "rgba(124,124,132, 0.1)",
        ],
        "canciones" => [
            [
                "nombre" => "Behind the door",
                "nombrejs" => "behind",
                "texto" => "<p>Discover what lies behind this ancient door.</p>",
                "ruta" => "NewOldWorldOrder/1.-behind-the-door.mp3"
            ],
            [
                "nombre" => "Cristal mines",
                "nombrejs" => "mines",
                "texto" => "<p>Follow the mining dwarfs as they work in the crystal mines.</p>",
                "ruta" => "NewOldWorldOrder/2.-cristal-mines.mp3"
            ],
            [
                "nombre" => "Cristal wars",
                "nombrejs" => "wars",
                "texto" => "<p>The eternal wars suffered by the main town for its precious mineral.</p>",
                "ruta" => "NewOldWorldOrder/3.-cristal-wars.mp3"
            ],
            [
                "nombre" => "Doubtfull goddess",
                "nombrejs" => "doubtfull",
                "texto" => "<p>Due to the wars, the goddess of this world start to doubt.</p>",
                "ruta" => "NewOldWorldOrder/4.-doubtfull-Goddess.mp3"
            ],
            [
                "nombre" => "Of goddess and mankind",
                "nombrejs" => "mankind",
                "texto" => "<p>Reconciliation of the mining town with its goddess.</p>",
                "ruta" => "NewOldWorldOrder/5.-Of-Goddess-and-Mankind.mp3"
            ],
        ] // cierra canciones
    ], //Cierra el disco New old world order
]//Cierra disco
    ?>
