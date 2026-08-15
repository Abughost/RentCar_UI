import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { news as newsApi, toList } from '../api/endpoints'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Alert, Icon, Spinner } from '../components/primitives'

/** The CKEditor-authored articles from the Django admin. */
export function NewsList() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ac = new AbortController()
    newsApi
      .list({ signal: ac.signal })
      .then((data) => setStories(toList(data)))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [])

  return (
    <div className="page">
      <Nav />
      <div className="sec">
        <div className="sec__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>
              From the road
            </p>
            <h1 className="dh2">News</h1>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}
        {loading ? (
          <Spinner label="Loading stories" />
        ) : stories.length === 0 ? (
          <div className="empty">
            <h2 className="dh3" style={{ marginBottom: 8 }}>
              Nothing published yet
            </h2>
            <p className="small">Articles written in the Django admin show up here.</p>
          </div>
        ) : (
          <div className="news">
            {stories.map((story) => (
              <Link key={story.id} to={`/news/${story.id}`} className="news__c">
                {story.image ? (
                  <img className="news__img" src={mediaUrl(story.image)} alt="" loading="lazy" />
                ) : (
                  <div className="news__img" />
                )}
                <div className="news__body">
                  <p className="eyebrow">News</p>
                  <h2 className="news__t">{story.title}</h2>
                  <p
                    className="news__x"
                    dangerouslySetInnerHTML={{ __html: story.description }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <TabBar />
    </div>
  )
}

export function NewsDetail() {
  const { id } = useParams()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ac = new AbortController()
    newsApi
      .detail(id, { signal: ac.signal })
      .then(setStory)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [id])

  return (
    <div className="page">
      <Nav />
      <div className="crumb">
        <Link to="/news">News</Link>
        <Icon name="chev" size="sm" />
        <span className="crumb__now">{story?.title || '—'}</span>
      </div>

      <div className="sec" style={{ paddingTop: 20 }}>
        {loading ? (
          <Spinner label="Loading the story" />
        ) : error || !story ? (
          <Alert>{error || 'That story is no longer published.'}</Alert>
        ) : (
          <article style={{ maxWidth: '70ch' }}>
            <h1 className="dh2" style={{ marginBottom: 18 }}>
              {story.title}
            </h1>
            {story.image && (
              <img
                src={mediaUrl(story.image)}
                alt=""
                style={{ width: '100%', borderRadius: 'var(--r-m)', marginBottom: 24 }}
              />
            )}
            <div
              className="lede"
              // Trusted HTML: authored by staff in the CKEditor 5 admin widget.
              dangerouslySetInnerHTML={{ __html: story.description }}
            />
          </article>
        )}
      </div>
      <Footer />
      <TabBar />
    </div>
  )
}
