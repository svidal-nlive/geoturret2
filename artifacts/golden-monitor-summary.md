# Golden Monitor Summary

Cases with differences:

- case#0 seed=g1 diffs -> kills:3!=4, r:2991787091!=193872715, k:3!=4, om:0.22999999999999998!=0.28
- case#1 seed=g2 diffs -> r:926559944!=1340044394, g:6!=8, om:0.6200000000000001!=0.6600000000000001
- case#2 seed=g3-parallax diffs -> kills:4!=1, r:2282704807!=1131506719, k:4!=1, g:4!=1, om:0.28!=0.07
- case#3 seed=g4-grazeOD diffs -> r:4131850183!=3501171838, g:6!=7, om:0.5!=0.44000000000000006
- case#4 seed=g5-boss diffs -> kills:13!=14, r:3824150470!=3791799449, k:13!=14, g:7!=6, om:0.7900000000000003!=0.8200000000000003
- case#5 seed=g6-boss-safe diffs -> r:1234517741!=2811606919, g:17!=14
- case#6 seed=g7-boss-multi diffs -> kills:36!=37, r:761060766!=3127471745, k:36!=37, om:0.39999999999999997!=0.3
- case#7 seed=g8-boss-future diffs -> kills:16!=17, r:2835398779!=3555254157, k:16!=17, g:12!=10
- case#8 seed=g9-boss-spiral diffs -> kills:60!=63, wave:3!=4, r:3279807599!=1563111862, k:60!=63, w:3!=4, g:32!=40, oa:false!=true

## By Metric

- **g**: g2(g:6!=8), g3-parallax(g:4!=1), g4-grazeOD(g:6!=7), g5-boss(g:7!=6), g6-boss-safe(g:17!=14), g8-boss-future(g:12!=10), g9-boss-spiral(g:32!=40)
- **k**: g1(k:3!=4), g3-parallax(k:4!=1), g5-boss(k:13!=14), g7-boss-multi(k:36!=37), g8-boss-future(k:16!=17), g9-boss-spiral(k:60!=63)
- **kills**: g1(kills:3!=4), g3-parallax(kills:4!=1), g5-boss(kills:13!=14), g7-boss-multi(kills:36!=37), g8-boss-future(kills:16!=17), g9-boss-spiral(kills:60!=63)
- **oa**: g9-boss-spiral(oa:false!=true)
- **om**: g1(om:0.22999999999999998!=0.28), g2(om:0.6200000000000001!=0.6600000000000001), g3-parallax(om:0.28!=0.07), g4-grazeOD(om:0.5!=0.44000000000000006), g5-boss(om:0.7900000000000003!=0.8200000000000003), g7-boss-multi(om:0.39999999999999997!=0.3)
- **r**: g1(r:2991787091!=193872715), g2(r:926559944!=1340044394), g3-parallax(r:2282704807!=1131506719), g4-grazeOD(r:4131850183!=3501171838), g5-boss(r:3824150470!=3791799449), g6-boss-safe(r:1234517741!=2811606919), g7-boss-multi(r:761060766!=3127471745), g8-boss-future(r:2835398779!=3555254157), g9-boss-spiral(r:3279807599!=1563111862)
- **w**: g9-boss-spiral(w:3!=4)
- **wave**: g9-boss-spiral(wave:3!=4)