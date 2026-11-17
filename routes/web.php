<?php
$router->add('GET','/',function(){require BASE_PATH.'/resources/views/battle/arena.php';return null;},false);
$router->add('GET','/markers',function(){require BASE_PATH.'/resources/views/cards/markers.php';return null;},false);
$router->add('GET','/admin',function(){require BASE_PATH.'/resources/views/admin/index.php';return null;},true,true);

$router->add('GET','/install',[\App\Controllers\InstallerController::class,'index'],false);
$router->add('POST','/install',[\App\Controllers\InstallerController::class,'install'],false);
