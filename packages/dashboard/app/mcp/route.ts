import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/server/mcp-server'

async function handle(request: Request): Promise<Response> {
  const server = createMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export { handle as GET, handle as POST, handle as DELETE }
