using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace SpotuneLauncher
{
    static class Program
    {
        private static Process serverProcess = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(appDir, "server", "index.js");

            // Ensure server exists
            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "Spotune server files not found in: " + appDir + "\nPlease make sure Spotune.exe is placed in the Spotune project folder.",
                    "Spotune Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            int port = 3000;
            string url = "http://localhost:" + port;

            // Check if server is already running
            if (!IsServerRunning(url))
            {
                // Find node executable
                string nodePath = FindNodeExecutable(appDir);
                if (string.IsNullOrEmpty(nodePath))
                {
                    MessageBox.Show(
                        "Node.js is required to run the local Hi-Fi music engine.\nPlease install Node.js from https://nodejs.org or run start-spotune.bat.",
                        "Node.js Required",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                // Start Node server silently
                try
                {
                    ProcessStartInfo startInfo = new ProcessStartInfo();
                    startInfo.FileName = nodePath;
                    startInfo.Arguments = "\"" + serverScript + "\"";
                    startInfo.WorkingDirectory = appDir;
                    startInfo.CreateNoWindow = true;
                    startInfo.UseShellExecute = false;
                    startInfo.WindowStyle = ProcessWindowStyle.Hidden;

                    serverProcess = Process.Start(startInfo);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Failed to launch music server: " + ex.Message, "Spotune", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Wait up to 6 seconds for server to come online
                bool ready = false;
                for (int i = 0; i < 24; i++)
                {
                    Thread.Sleep(250);
                    if (IsServerRunning(url))
                    {
                        ready = true;
                        break;
                    }
                }

                if (!ready)
                {
                    // Continue anyway and try opening
                }
            }

            // Launch App Window
            LaunchAppWindow(url);
        }

        private static bool IsServerRunning(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url + "/api/ping");
                req.Timeout = 500;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable(string appDir)
        {
            // 1. Look in workspace root
            string localNode = Path.Combine(appDir, "node.exe");
            if (File.Exists(localNode)) return localNode;

            // 2. Look in C:\Users\node.exe
            string userNode = @"C:\Users\node.exe";
            if (File.Exists(userNode)) return userNode;

            // 3. Look in Program Files
            string pfNode = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(pfNode)) return pfNode;

            string pf86Node = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(pf86Node)) return pf86Node;

            // 4. Look in AppData
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string nvmNode = Path.Combine(appData, @"nvm\current\node.exe");
            if (File.Exists(nvmNode)) return nvmNode;

            return "node";
        }

        private static void LaunchAppWindow(string url)
        {
            // Try Edge App Mode (Standalone window, dark theme, native look)
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            // Try Chrome App Mode
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
            {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            string browserPath = null;
            if (File.Exists(edgePath)) browserPath = edgePath;
            else if (File.Exists(chromePath)) browserPath = chromePath;

            if (browserPath != null)
            {
                ProcessStartInfo appWindow = new ProcessStartInfo();
                appWindow.FileName = browserPath;
                appWindow.Arguments = "--app=" + url + " --window-size=1280,820";
                Process browserProc = Process.Start(appWindow);
                if (browserProc != null && serverProcess != null)
                {
                    browserProc.WaitForExit();
                    // Clean up server process when window is closed
                    try
                    {
                        if (!serverProcess.HasExited) serverProcess.Kill();
                    }
                    catch {}
                }
            }
            else
            {
                // Fallback to default browser
                Process.Start(url);
            }
        }
    }
}
