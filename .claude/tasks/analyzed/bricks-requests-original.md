Salut Bernard,

ELO tourne en production chez nous depuis fin juillet : 2 007 expressions, 158 workflows, 35 organisations clientes. Le bénéfice pour lequel on l'a adopté est là et il se mesure — 657 refus explicites en trente jours, datés et réparables, là où notre moteur historique aurait continué en silence. Les erreurs de compilation typées, en particulier, sont excellentes : Unknown function min(Int, Int) dit ce qui manque et à quel type.
Ce qui nous a coûté — tout re-vérifié contre 1.0.1 le 18 septembre, pas de mémoire :

1. Pas d'accès sûr au nul. first([]).id lève un TypeError JS brut, et ni ?. ni ?? ne compilent — donc toute lecture de ligne doit être enveloppée dans if count(x) > 0 then … else …. 90 exécutions échouées en 30 jours, sur 4 organisations. Une navigation sûre ou un first_or(liste, défaut) règlerait ça..
2. L'erreur d'exécution montre le JS généré, pas l'expression : (_.node.get_class[0] ?? null).start_date… — ni [0] ni ?? n'étant de l'ELO, l'auteur lit du code qu'il n'a jamais écrit, sans ligne ni champ..
3. Identifiants à tiret. _.node.get-member échoue bruyamment, c'est parfait. Mais il n'y a pas d'accès entre crochets, donc la seule voie est at() — et count(at(_.node,'get-member')) rend la liste au lieu de 1, sans erreur. La bonne action produit le défaut..
4. substring prend (position, longueur), pas (début, fin). Les deux lectures rendent une chaîne valide, donc aucune erreur possible. C'est le seul endroit où on a produit un résultat faux sans le savoir..
5. String(uneDate) rend D2026-09-16T00:00:00 — le littéral ELO, préfixe compris. C'est ce qui a causé le 4..
6. Pas de Datetime(date, time) : composer une colonne date et une colonne time passe par de la chirurgie de chaînes, en production..
7. min/max sur deux nombres inconnus ; sort existe pour une liste simple, mais pas par clé — « la plus ancienne d'abord » n'est pas exprimable..
8. Aucun moyen d'écrire un caractère par son point de code : ni chr, ni échappement interprété dans les littéraux. Une espace insécable ne voyage qu'en caractère littéral, et se perd en silence..
9. Sans le runtime luxon injecté, la panne se manifeste loin de sa cause : NOW lève Cannot read properties of undefined (reading 'now'), qui ne nomme pas le runtime. Notre faute, mais un refus à la compilation aiderait..
10. Mineurs : guillemets simples uniquement (message clair, zéro coût) ; concat('a','b','c') refusé comme « fonction inconnue » alors que c'est la signature qui ne correspond pas..

S'il ne fallait en traiter qu'un : le 3. C'est le seul endroit où la correction que la doc propose introduit le défaut. Le plus cher pour nous reste le 1.
Le fil conducteur : ce qui échoue bruyamment se répare, ce qui réussit à côté de la cible se propage. Nos deux seules pertes de temps (3 et 4) sont les deux endroits où ELO ne pouvait pas refuser.

J'ai le relevé complet avec les sorties de sonde exactes si ça t'intéresse, et volontiers pour contribuer les cas de test.

Voir aussi https://bricks-softwares.com/p/616a58f4-4ba6-5015-bf1a-081f0e468446, où Claude a écrit un rationnel.
