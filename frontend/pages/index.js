import Head from 'next/head'
import PhotoMarketplace from '../components/PhotoMarketplace'

export default function Home() {
  return (
    <>
      <Head>
        <title>AMUNIK Marketplace - Buy and Sell Unique Photos</title>
        <meta name="description" content="A marketplace for buying and selling unique photography. Upload your photos and set your price, or browse and purchase amazing photos from other creators." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PhotoMarketplace />
    </>
  )
}
