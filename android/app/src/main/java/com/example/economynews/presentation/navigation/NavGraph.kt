package com.example.economynews.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.example.economynews.presentation.detail.DigestDetailScreen
import com.example.economynews.presentation.home.HomeScreen
import com.example.economynews.presentation.settings.SettingsScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    onLinkClick: (String) -> Unit,
) {
    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onDigestClick = { dateKst ->
                    navController.navigate("detail/$dateKst")
                },
                onSettingsClick = { navController.navigate("settings") },
            )
        }
        composable("settings") {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = "detail/{dateKst}",
            arguments = listOf(navArgument("dateKst") { type = NavType.StringType }),
            deepLinks = listOf(navDeepLink { uriPattern = "economynews://digest/{dateKst}" }),
        ) {
            DigestDetailScreen(
                onLinkClick = onLinkClick,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
