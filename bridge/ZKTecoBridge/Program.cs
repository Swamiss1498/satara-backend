using System;
using ZKAccess;

class Program
{
    static void Main(string[] args)
    {
        // Replace with your controller's IP and port
        const controllerIP = process.env.CONTROLLER_IP;
        const controllerPort = parseInt(process.env.CONTROLLER_PORT, 10);

        int ret = 0;
        IntPtr handle = IntPtr.Zero;

        try
        {
            // Create controller instance
            IController controller = new Controller();

            // Connect to C3-100
            bool isConnected = controller.Connect(controllerIP, controllerPort, out handle);
            if (!isConnected)
            {
                Console.WriteLine("Connection failed.");
                return;
            }

            Console.WriteLine("Connected to controller.");

            // Get card list
            object cardList = null;
            ret = controller.GetCardList(handle, out cardList);
            if (ret == 0)
            {
                Console.WriteLine("No card data or failed to read.");
            }
            else
            {
                // Display card data
                var cardArray = (object[,])cardList;
                for (int i = 0; i < cardArray.GetLength(0); i++)
                {
                    string cardNumber = cardArray[i, 0]?.ToString(); // Card No.
                    string pin = cardArray[i, 1]?.ToString();        // User ID
                    string name = cardArray[i, 2]?.ToString();       // Name (optional)
                    
                    Console.WriteLine($"Card Number: {cardNumber}, User ID: {pin}, Name: {name}");
                }
            }

            controller.Disconnect(handle);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }
}
