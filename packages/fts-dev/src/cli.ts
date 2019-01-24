import program from 'commander'
import { createDevServer } from '.'

export async function exec(argv: string[]) {
  program
    .name('fts')
    .usage('[options] <file.ts>')
    .option(
      '-P, --port <port>',
      'Port to listen on',
      (s) => parseInt(s, 10),
      3000
    )
    .parse(argv)

  let file: string
  if (program.args.length === 1) {
    file = program.args[0]
  } else {
    console.error('invalid arguments')
    program.help()
    process.exit(1)
  }

  await createDevServer(file, {
    port: program.port
  })
}

exec(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
