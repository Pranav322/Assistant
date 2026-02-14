# Embedding the Widget

Once your chatbot is trained, you can add it to your website so your visitors can interact with it.

## Configuration

Before embedding, ensure you have allowed your website's domain:
1.  Go to **Project Settings**.
2.  Find **"Allowed Origins"**.
3.  Add your website's URL (e.g., `https://www.mycompany.com`).
    *   *Note: usage from unauthorized domains will be blocked.*

## Embed Code

Copy the following code snippet and paste it into your website's HTML, preferably before the closing `</body>` tag.

```html
<script 
  src="https://your-platform-url.com/embed.js"
  data-project-id="YOUR_PROJECT_ID"
  data-position="bottom-right"
  async
></script>
```

Replace `YOUR_PROJECT_ID` with the ID found in your Project Dashboard.

### Customization Options

You can customize the widget behavior by adding data attributes to the script tag:

| Attribute | Description | Default |
| :--- | :--- | :--- |
| `data-position` | Where the button appears (`bottom-right`, `bottom-left`) | `bottom-right` |
| `data-primary-color` | Hex color code for the chat button | `#000000` |
| `data-greeting` | Initial message shown to users | "How can I help you?" |

## Troubleshooting

-   **Widget not showing?** Check your browser console (F12) for errors.
-   **401 Errors?** Ensure your domain is listed in "Allowed Origins".
